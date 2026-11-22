import { type Chat, Content, Models } from '@omujs/chat';
import type { Identifier } from '@omujs/omu';

import { ProviderTemporarilyUnavailable } from '../provider';

import { TransientFailure } from './youtube-api.js';
import type { ChatData, Sleep } from './youtube-chat-api.js';
import { type AuthorNames, YoutubeMessageParser } from './youtube-message-parser.js';
import type { JsonPath } from './youtube-page.js';
import { YoutubeRuns } from './youtube-runs.js';

export interface ChatSource {
    readonly videoId: string;
    next(): Promise<ChatData | undefined>;
    fetchMetadata(): Promise<Models.Room['metadata']>;
}

export interface RoomTimes {
    update(room: Models.Room, videoId: string): Promise<void>;
}

export interface AuthorProfiles {
    complete(author: Models.Author): Promise<void>;
}

export class YoutubeRoom implements AuthorNames {
    private static readonly METADATA_INTERVAL = 10;

    private readonly parser: YoutubeMessageParser;
    private readonly authorQueue: Models.Author[] = [];
    private readonly stopped: Promise<undefined>;
    private signalStop: () => void = () => {};
    private ended = false;

    public constructor(
        private readonly chat: Chat,
        public readonly room: Models.Room,
        public readonly channel: Models.Channel | undefined,
        private readonly source: ChatSource,
        private readonly times: RoomTimes,
        private readonly profiles: AuthorProfiles,
        private readonly sleep: Sleep = Bun.sleep,
    ) {
        this.parser = new YoutubeMessageParser(room.providerId, room.id, this);
        this.stopped = new Promise((resolve) => {
            this.signalStop = () => resolve(undefined);
        });
    }

    public get closed(): boolean {
        return this.ended;
    }

    public knownName(id: Identifier): string | undefined {
        return this.chat.authors.cache.get(id.key())?.name;
    }

    public async run(): Promise<void> {
        if (this.ended) return;
        void this.fetchAuthors();
        try {
            this.room.connected = true;
            await this.chat.rooms.update(this.room);
            for (let count = 0; !this.ended; count++) {
                let data: ChatData | undefined;
                try {
                    data = await this.untilStopped(this.source.next());
                } catch (error) {
                    if (!(error instanceof ProviderTemporarilyUnavailable)) throw error;
                    console.warn(`YouTube ${this.source.videoId}: ${error.message}; retrying in 10 seconds`);
                    await this.wait(10_000);
                    continue;
                }
                if (!data || this.ended) break;
                await this.process(data);
                await this.wait(1000 / 3);
                if (count % YoutubeRoom.METADATA_INTERVAL === 0) await this.updateMetadata();
            }
        } finally {
            await this.stop();
        }
    }

    public async stop(): Promise<void> {
        if (this.ended) return;
        this.ended = true;
        this.signalStop();
        this.room.connected = false;
        this.room.status = 'offline';
        await this.chat.rooms.update(this.room);
        try {
            await Promise.race([
                this.times.update(this.room, this.source.videoId),
                Bun.sleep(5000).then(() => {
                    throw new ProviderTemporarilyUnavailable('final timestamps timed out');
                }),
            ]);
        } catch (error) {
            if (!TransientFailure.is(error)) throw error;
            console.warn(`YouTube ${this.source.videoId}: final timestamps unavailable: ${TransientFailure.detail(error)}`);
        }
        await this.chat.rooms.update(this.room);
    }

    public async process(data: ChatData): Promise<void> {
        const messages: Models.Message[] = [];
        const authors: Models.Author[] = [];
        for (const action of data.actions) {
            const item = action.get('addChatItemAction', 'item');
            if (item.has()) {
                const parsed = this.parser.parse(item);
                if (parsed) {
                    messages.push(parsed.message);
                    authors.push(parsed.author);
                }
                continue;
            }
            const deleted = action.get('markChatItemAsDeletedAction').has()
                ? action.get('markChatItemAsDeletedAction')
                : action.get('removeChatItemAction');
            if (deleted.has()) {
                await this.markDeleted(deleted.get('targetItemId').string() ?? '');
                continue;
            }
            if (action.get('updateLiveChatPollAction').has()) {
                await this.updatePoll(action.get('updateLiveChatPollAction', 'pollToUpdate', 'pollRenderer'));
                continue;
            }
            if (action.get('addLiveChatTickerItemAction').has() || action.get('removeChatItemByAuthorAction').has()) continue;
            console.warn('YouTube: unknown chat action', Object.keys(action.object() ?? {}));
        }
        if (authors.length > 0) {
            this.authorQueue.push(...authors.filter((author) => !this.chat.authors.cache.has(author.id.key())));
            const added: Models.Author[] = [];
            for (const author of authors) {
                if (!await this.chat.authors.get(author.id.key())) added.push(author);
            }
            await this.chat.authors.add(...added);
        }
        if (messages.length > 0) {
            await this.chat.messages.add(...messages);
            this.room.metadata.first_message_id ||= messages[0].id.key();
            this.room.metadata.last_message_id = messages.at(-1)?.id.key();
            await this.chat.rooms.update(this.room);
        }
        await this.notifyReactions(data.mutations);
    }

    private async updateMetadata(): Promise<void> {
        try {
            Object.assign(this.room.metadata, await this.source.fetchMetadata());
            await this.chat.rooms.update(this.room);
        } catch (error) {
            if (!TransientFailure.is(error)) throw error;
            console.warn(`YouTube ${this.source.videoId}: metadata: ${TransientFailure.detail(error)}; retrying next update`);
        }
    }

    private async markDeleted(targetId: string): Promise<void> {
        const message = await this.chat.messages.get(this.room.id.join(targetId).key());
        if (!message) return;
        message.deleted = true;
        await this.chat.messages.update(message);
    }

    private async updatePoll(poll: JsonPath): Promise<void> {
        const header = poll.get('header', 'pollHeaderRenderer');
        await this.chat.votes.add(new Models.Vote({
            id: this.room.id.join(poll.get('liveChatPollId').string() ?? ''),
            roomId: this.room.id,
            title: Content.format(YoutubeRuns.parse(header.get('pollQuestion'))),
            choices: poll.get('choices').list().map((choice) => ({
                text: Content.format(YoutubeRuns.parse(choice.get('text'))),
                ratio: Number(choice.get('voteRatio').value ?? 0),
            })),
            total: YoutubeRoom.totalVotes(header.get('metadataText')),
            ended: false,
        }));
    }

    private async notifyReactions(mutations: JsonPath[]): Promise<void> {
        const counts: Record<string, number> = {};
        for (const mutation of mutations) {
            const fountain = mutation.get('payload', 'emojiFountainDataEntity');
            for (const bucket of fountain.get('reactionBuckets').list()) {
                for (const reaction of bucket.get('reactions').list()) {
                    const key = reaction.get('key').string();
                    if (key) counts[key] = (counts[key] ?? 0) + Number(reaction.get('value').value ?? 0);
                }
                for (const reaction of bucket.get('reactionsData').list()) {
                    const key = reaction.get('unicodeEmojiId').string();
                    if (key) counts[key] = (counts[key] ?? 0) + Number(reaction.get('reactionCount').value ?? 0);
                }
            }
        }
        if (Object.keys(counts).length === 0) return;
        await this.chat.reactionSignal.notify(new Models.Reaction({ roomId: this.room.id, reactions: counts }));
    }

    private async fetchAuthors(): Promise<void> {
        while (!this.ended) {
            const author = this.authorQueue.shift();
            if (!author) {
                await this.wait(1000);
                continue;
            }
            try {
                await this.profiles.complete(author);
                await this.chat.authors.update(author);
                await this.wait(3000);
            } catch (error) {
                console.error(`Error fetching metadata for author ${author.id.key()}`, error);
            }
        }
    }

    private async wait(ms: number): Promise<void> {
        await this.untilStopped(this.sleep(ms));
    }

    private untilStopped<T>(promise: Promise<T>): Promise<T | undefined> {
        return Promise.race([promise, this.stopped]);
    }

    private static totalVotes(metadata: JsonPath): number | null {
        const last = metadata.get('runs').list().at(-1);
        const text = last?.get('text').string();
        if (!text) return null;
        const total = /\d+/.exec(text)?.[0];
        return total ? Number.parseInt(total, 10) : null;
    }
}
