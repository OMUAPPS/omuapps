import { type Chat, type Content, Models } from '@omujs/chat';
import type { Identifier } from '@omujs/omu';

import type { ProviderHttp } from '../provider';

import type { Emoticon, PicartoEmoticons } from './picarto-emoticons.js';

export type PicartoMessage = {
    id?: string | number;
    u?: string | number;
    i?: string;
    n?: string;
    cb?: { c: string | number; i: string } | null;
    m: string;
    d?: number;
    e?: Emoticon[];
};

type ServerCommand =
    | { type: 'stream'; messages: { online: boolean; name: string; streams: { thumbnail_image: string; viewers: number }[] } }
    | { type: 'ctt' | 'st' }
    | { type: string }
    | { t: 'c'; m: PicartoMessage[] }
    | { t: string }
    | { code: string };

type JwtResponse = {
    data: { generateJwtToken: { key: string } };
};

export class PicartoMessageParser {
    public constructor(
        private readonly provider: Models.Provider,
        private readonly channel: Models.Channel,
        private readonly room: Models.Room,
        private readonly emoticons: PicartoEmoticons,
    ) {}

    public message(data: PicartoMessage): { message: Models.Message; author: Models.Author | undefined } {
        const author = this.author(data);
        const message = new Models.Message({
            roomId: this.room.id,
            id: this.room.id.join(String(data.id ?? crypto.randomUUID())),
            authorId: author?.id,
            content: this.content(data),
            createdAt: data.d === undefined ? new Date() : new Date(data.d),
            deleted: false,
        });
        return { message, author };
    }

    public content(data: PicartoMessage): Content.Root {
        this.emoticons.addAll(data.e ?? []);
        const children: Content.Component[] = [];
        const text = data.m;
        let index = 0;
        while (index < text.length) {
            const start = text.indexOf(':', index);
            const end = start === -1 ? -1 : text.indexOf(':', start + 1);
            if (end === -1) {
                children.push({ type: 'text', data: text.slice(index) });
                break;
            }
            if (start > index) children.push({ type: 'text', data: text.slice(index, start) });
            const alias = text.slice(start + 1, end);
            const emoticon = this.emoticons.get(alias);
            if (emoticon) {
                const url = emoticon.u.startsWith('data:') ? emoticon.u : `https://images.picarto.tv/${emoticon.u}`;
                children.push({ type: 'image', data: { id: alias, name: alias, url } });
            } else {
                children.push({ type: 'text', data: `:${alias}:` });
            }
            index = end + 1;
        }
        return { type: 'root', data: children };
    }

    private author(data: PicartoMessage): Models.Author | undefined {
        if (data.u === undefined) return;
        const avatarUrl = data.i === undefined ? undefined : `https://images.picarto.tv/${data.i}`;
        const roles = data.cb && typeof data.cb === 'object'
            ? [new Models.Role({
                id: String(data.cb.c),
                name: String(data.cb.c),
                isModerator: false,
                isOwner: false,
                iconUrl: `https://images.picarto.tv/${data.cb.i}`,
            })]
            : [];
        return new Models.Author({
            providerId: this.provider.id,
            id: this.channel.id.join(String(data.u)),
            avatarUrl,
            name: data.n,
            metadata: {
                avatar_url: avatarUrl,
                screen_id: data.n,
                url: data.n === undefined ? undefined : `https://picarto.tv/${data.n}`,
            },
            roles,
        });
    }
}

export class PicartoChat {
    private static readonly INITIAL_MESSAGES = [
        { type: 'welcomeMessage' },
        { type: 'accessLevelMessage' },
        { type: 'chatNext', page: 1, paginated: false },
        { type: 'settings' },
        { type: 'topChips' },
        { type: 'topChips' },
    ];

    public closed = false;
    private readonly ping: ReturnType<typeof setInterval>;
    private readonly parser: PicartoMessageParser;

    private constructor(
        private readonly chat: Chat,
        private readonly room: Models.Room,
        private readonly socket: WebSocket,
        provider: Models.Provider,
        channel: Models.Channel,
        emoticons: PicartoEmoticons,
    ) {
        this.parser = new PicartoMessageParser(provider, channel, room, emoticons);
        socket.addEventListener('message', (event) => {
            void this.handle(JSON.parse(String(event.data))).catch((error) => console.error('[Picarto] Failed to handle message', error));
        });
        socket.addEventListener('close', () => {
            this.closed = true;
            clearInterval(this.ping);
        });
        this.ping = setInterval(() => socket.send(JSON.stringify({ type: 'ping', message: '__ping__' })), 30_000);
    }

    public static async connect(
        http: ProviderHttp,
        chat: Chat,
        provider: Models.Provider,
        channel: Models.Channel,
        emoticons: PicartoEmoticons,
    ): Promise<PicartoChat> {
        const name = channel.id.path.at(-1) ?? '';
        const key = await PicartoChat.token(http, name);
        const socket = new WebSocket(`wss://chat.picarto.tv/chat/token=${key}`);
        await new Promise<void>((resolve, reject) => {
            socket.addEventListener('open', () => resolve(), { once: true });
            socket.addEventListener('error', () => reject(new Error(`[Picarto] Failed to connect to ${name}`)), { once: true });
        });
        for (const message of PicartoChat.INITIAL_MESSAGES) {
            socket.send(JSON.stringify(message));
        }
        const now = new Date();
        const room = new Models.Room({
            id: channel.id,
            providerId: provider.id,
            connected: true,
            status: 'online',
            metadata: {
                created_at: now.toISOString(),
                started_at: now.toISOString(),
                title: name,
                thumbnail: `https://thumb-us-losangeles.picarto.tv/thumbnail/${name}.jpg`,
                url: `https://picarto.tv/${name}`,
            },
            channelId: channel.id.key(),
            createdAt: now,
        });
        await chat.rooms.update(room);
        return new PicartoChat(chat, room, socket, provider, channel, emoticons);
    }

    public get roomId(): Identifier {
        return this.room.id;
    }

    public stop(): void {
        this.closed = true;
        clearInterval(this.ping);
        this.socket.close();
    }

    private async handle(command: ServerCommand): Promise<void> {
        if ('type' in command) {
            if (command.type === 'ctt' || command.type === 'st') return;
            if (command.type === 'stream' && 'messages' in command) {
                const detail = command.messages;
                this.room.status = detail.online ? 'online' : 'offline';
                for (const stream of detail.streams) {
                    this.room.metadata.thumbnail = stream.thumbnail_image;
                    this.room.metadata.viewers = stream.viewers;
                    this.room.metadata.url = `https://picarto.tv/${detail.name}`;
                }
                await this.chat.rooms.update(this.room);
                return;
            }
            console.warn(`[Picarto] Unknown message type ${command.type}`);
            return;
        }
        if ('t' in command) {
            if (command.t === 'c' && 'm' in command) {
                await this.addMessages(command.m);
                return;
            }
            console.warn(`[Picarto] Unknown message type ${command.t}`);
            return;
        }
        if ('code' in command && command.code === 'PONG') return;
        console.warn('[Picarto] Unknown message scheme', command);
    }

    private async addMessages(data: PicartoMessage[]): Promise<void> {
        const parsed = data.map((item) => this.parser.message(item));
        const authors = new Map<string, Models.Author>();
        for (const { author } of parsed) {
            if (author && !this.chat.authors.cache.has(author.id.key())) authors.set(author.id.key(), author);
        }
        if (authors.size > 0) await this.chat.authors.add(...authors.values());
        const messages = parsed.map(({ message }) => message);
        if (messages.length === 0) return;
        await this.chat.messages.add(...messages);
        this.room.metadata.first_message_id ??= messages[0].id.key();
        this.room.metadata.last_message_id = messages.at(-1)?.id.key();
        await this.chat.rooms.update(this.room);
    }

    private static async token(http: ProviderHttp, name: string): Promise<string> {
        const response = await http.json<JwtResponse>('https://ptvintern.picarto.tv/ptvapi', {
            method: 'POST',
            headers: {
                'accept': 'application/graphql-response+json, application/graphql+json, application/json, text/event-stream, multipart/mixed',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                operationName: 'generateJwtToken',
                query: 'query generateJwtToken($name: String!, $userId: Int!) {\n  generateJwtToken(channel_name: $name, user_id: $userId) {\n    key\n    __typename\n  }\n}',
                variables: { name, userId: 0 },
            }),
        });
        return response.data.generateJwtToken.key;
    }
}
