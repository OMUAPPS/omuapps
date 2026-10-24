import type { Models } from '@omujs/chat';
import { Content } from '@omujs/chat';

import { ProviderTemporarilyUnavailable } from '../provider';

import { TransientFailure, YoutubeApi } from './youtube-api.js';
import { JsonPath, YoutubeContinuation } from './youtube-page.js';
import { YoutubeRuns } from './youtube-runs.js';

export type ChatData = {
    actions: JsonPath[];
    mutations: JsonPath[];
};

export type Sleep = (ms: number) => Promise<void>;

export class YoutubeChatApi {
    private metadataContinuation: string | undefined;

    private constructor(
        public readonly videoId: string,
        private readonly api: YoutubeApi,
        private apiKey: string,
        private continuation: string | undefined,
        private readonly sleep: Sleep,
    ) {}

    public static async fromVideoId(api: YoutubeApi, videoId: string, sleep: Sleep = Bun.sleep): Promise<YoutubeChatApi> {
        const page = await api.page(`${YoutubeApi.URL}/live_chat`, { v: videoId });
        const continuation = YoutubeContinuation.fromChatPage(page);
        if (!continuation) throw new Error('Could not find continuation');
        return new YoutubeChatApi(videoId, api, page.apiKey, continuation, sleep);
    }

    public get chatContinuation(): string | undefined {
        return this.continuation;
    }

    public async resetContinuation(): Promise<boolean> {
        const page = await this.api.page(`${YoutubeApi.URL}/live_chat`, { v: this.videoId });
        this.apiKey = page.apiKey;
        const continuation = YoutubeContinuation.fromChatPage(page);
        if (!continuation) return false;
        this.continuation = continuation;
        return true;
    }

    public isOnline(): Promise<boolean> {
        return this.api.isOnline(this.videoId);
    }

    public async next(): Promise<ChatData | undefined> {
        for (let attempt = 0; ; attempt++) {
            try {
                return await this.fetch();
            } catch (error) {
                if (!TransientFailure.is(error)) throw error;
                this.continuation = undefined;
                if (await this.api.hasEnded(this.videoId)) return;
                if (attempt === 3) {
                    throw new ProviderTemporarilyUnavailable(`${this.videoId}: chat fetch: ${TransientFailure.detail(error)}`, { cause: error });
                }
                await this.sleep(10_000);
            }
        }
    }

    public async fetchMetadata(): Promise<Models.Room['metadata']> {
        const data = await this.api.updatedMetadata(this.videoId, this.apiKey, this.metadataContinuation);
        this.metadataContinuation = data.get('continuation', 'timedContinuationData', 'continuation').string();
        const metadata: Models.Room['metadata'] = {};
        for (const action of data.get('actions').list()) {
            const viewers = action.get('updateViewershipAction', 'viewCount', 'videoViewCountRenderer', 'originalViewCount').value;
            if (viewers !== undefined && viewers !== null) metadata.viewers = Number.parseInt(String(viewers), 10);
            if (action.get('updateTitleAction').has()) {
                metadata.title = Content.format(YoutubeRuns.parse(action.get('updateTitleAction', 'title')));
            }
            if (action.get('updateDescriptionAction').has()) {
                metadata.description = Content.format(YoutubeRuns.parse(action.get('updateDescriptionAction', 'description')));
            }
        }
        for (const mutation of data.get('frameworkUpdates', 'entityBatchUpdate', 'mutations').list()) {
            const likes = mutation.get('payload', 'likeCountEntity', 'likeCountIfIndifferentNumber').value;
            if (likes !== undefined && likes !== null) metadata.likes = Number.parseInt(String(likes), 10);
        }
        if (!metadata.viewers) delete metadata.viewers;
        if (!metadata.title) delete metadata.title;
        if (!metadata.description) delete metadata.description;
        return metadata;
    }

    private async fetch(): Promise<ChatData> {
        if (!this.continuation && !await this.resetContinuation()) {
            throw new ProviderTemporarilyUnavailable('live_chat: missing continuation');
        }
        const data = await this.api.liveChat(this.videoId, this.apiKey, this.continuation);
        const contents = data.get('continuationContents');
        if (!contents.has()) throw new ProviderTemporarilyUnavailable('get_live_chat: missing chat contents');
        const live = contents.get('liveChatContinuation');
        const continuations = live.get('continuations');
        if (!Array.isArray(continuations.value)) throw new TypeError('liveChatContinuation.continuations');
        this.continuation = YoutubeContinuation.first(continuations);
        const actions = live.get('actions');
        if (actions.has() && !Array.isArray(actions.value)) throw new ProviderTemporarilyUnavailable('get_live_chat: invalid actions');
        const updates = data.get('frameworkUpdates');
        if (updates.has() && !updates.object()) throw new TypeError('frameworkUpdates');
        const mutations = updates.get('entityBatchUpdate', 'mutations');
        if (mutations.has() && !Array.isArray(mutations.value)) throw new ProviderTemporarilyUnavailable('get_live_chat: invalid mutations');
        return { actions: actions.list(), mutations: mutations.list() };
    }
}
