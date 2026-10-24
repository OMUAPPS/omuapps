import { Throttle } from '@omujs/iwashi';

import { ProviderTemporarilyUnavailable } from '../provider';

import { type Json, JsonPath, YoutubeContinuation, YoutubePage } from './youtube-page.js';

export type TransportResponse = {
    status: number;
    text(): Promise<string>;
    json(): Promise<unknown>;
};

export interface YoutubeTransport {
    get(url: string, params?: Record<string, string>): Promise<TransportResponse>;
    post(url: string, params: Record<string, string>, payload: unknown): Promise<TransportResponse>;
}

export class TransientFailure {
    public static is(error: unknown): boolean {
        return error instanceof ProviderTemporarilyUnavailable
            || error instanceof TypeError
            || error instanceof SyntaxError
            || error instanceof RangeError;
    }

    public static detail(error: unknown): string {
        if (error instanceof ProviderTemporarilyUnavailable) return error.message;
        return error instanceof Error ? error.name : String(error);
    }
}

export class YoutubeApi {
    public static readonly URL = 'https://www.youtube.com';
    public static readonly PATTERN: RegExp = new RegExp(
        String.raw`(youtu\.be\/(?<video_id_short>[\w-]+))|(m\.)?youtube\.com\/`
        + String.raw`(watch\?v=(?<video_id>[\w_-]+|)|@(?<channel_id_vanity>[^/]+|)`
        + String.raw`|channel\/(?<channel_id>[^/]+|)|user\/(?<channel_id_user>[^/]+|)`
        + String.raw`|c\/(?<channel_id_c>[^/]+|))`,
    );
    private static readonly BASE_PAYLOAD = {
        context: { client: { clientName: 'WEB', clientVersion: '2.20240416.05.00' } },
    };

    public constructor(
        private readonly transport: YoutubeTransport,
        private readonly throttle: Throttle = new Throttle(1000 / 3),
    ) {}

    public async page(url: string, params?: Record<string, string>): Promise<YoutubePage> {
        let response: TransportResponse;
        try {
            await this.throttle.wait();
            response = await this.transport.get(url, params);
        } catch (error) {
            throw new ProviderTemporarilyUnavailable(`page: ${TransientFailure.detail(error)}`, { cause: error });
        }
        if (Math.floor(response.status / 100) !== 2) throw new ProviderTemporarilyUnavailable(`page HTTP ${response.status}`);
        return YoutubePage.parse(await response.text());
    }

    public async liveChat(videoId: string, key: string, continuation: string | undefined): Promise<JsonPath> {
        const payload = { ...YoutubeApi.BASE_PAYLOAD, ...(continuation ? { continuation } : {}) };
        return this.postJson(`${YoutubeApi.URL}/youtubei/v1/live_chat/get_live_chat`, { v: videoId, key }, payload);
    }

    public async updatedMetadata(videoId: string, key: string, continuation: string | undefined): Promise<JsonPath> {
        const payload = { ...YoutubeApi.BASE_PAYLOAD, ...(continuation === undefined ? { videoId } : { continuation }) };
        return this.postJson(`${YoutubeApi.URL}/youtubei/v1/updated_metadata`, { key }, payload);
    }

    public async fetchOnlineVideos(url: string): Promise<string[]> {
        const groups = YoutubeApi.PATTERN.exec(url)?.groups;
        if (!groups) throw new Error('Could not match url');
        let videoId: string | undefined = groups.video_id || groups.video_id_short;
        if (!videoId) {
            const channelId = groups.channel_id || await this.channelIdByVanity(groups.channel_id_vanity || groups.channel_id_user || groups.channel_id_c);
            if (!channelId) throw new Error('Could not find channel id');
            videoId = await this.videoIdByChannel(channelId);
            if (!videoId) return [];
        }
        if (!await this.isOnline(videoId)) return [];
        return [videoId];
    }

    public async isOnline(videoId: string): Promise<boolean> {
        try {
            const page = await this.page(`${YoutubeApi.URL}/live_chat`, { v: videoId });
            const continuation = YoutubeContinuation.fromChatPage(page);
            if (!continuation) throw new ProviderTemporarilyUnavailable('live_chat: missing continuation');
            const data = await this.liveChat(videoId, page.apiKey, continuation);
            if (data.get('continuationContents', 'liveChatContinuation').object()) return true;
            throw new ProviderTemporarilyUnavailable('get_live_chat: missing chat contents');
        } catch (error) {
            if (!TransientFailure.is(error)) throw error;
            if (await this.hasEnded(videoId)) return false;
            throw new ProviderTemporarilyUnavailable(`${videoId}: online check: ${TransientFailure.detail(error)}`, { cause: error });
        }
    }

    public async hasEnded(videoId: string): Promise<boolean> {
        try {
            const page = await this.page(`${YoutubeApi.URL}/watch`, { v: videoId });
            const end = page.playerResponse().get('microformat', 'playerMicroformatRenderer', 'liveBroadcastDetails', 'endTimestamp').string();
            if (!end || Number.isNaN(Date.parse(end))) return false;
        } catch (error) {
            if (TransientFailure.is(error)) return false;
            throw error;
        }
        console.info(`YouTube ${videoId}: stream ended (endTimestamp confirmed)`);
        return true;
    }

    private async channelIdByVanity(vanity: string | undefined): Promise<string | undefined> {
        if (!vanity) return;
        const page = await this.page(`${YoutubeApi.URL}/@${vanity}`);
        return page.selectAttribute('meta[itemprop="identifier"]', 'content');
    }

    private async videoIdByChannel(channelId: string): Promise<string | undefined> {
        const page = await this.page(`${YoutubeApi.URL}/embed/live_stream`, { channel: channelId });
        const canonical = page.selectAttribute('link[rel="canonical"]', 'href');
        if (canonical === undefined) return this.videoIdByChannelPage(channelId);
        const groups = YoutubeApi.PATTERN.exec(canonical)?.groups;
        return groups?.video_id || groups?.video_id_short || undefined;
    }

    private async videoIdByChannelPage(channelId: string): Promise<string | undefined> {
        let page: YoutubePage;
        try {
            page = await this.page(`${YoutubeApi.URL}/channel/${channelId}`);
        } catch {
            return;
        }
        const data = page.initialData();
        if (!data) throw new Error(`Could not get initial data for channel ${channelId}`);
        return data.get(
            'header', 'pageHeaderRenderer', 'content', 'pageHeaderViewModel', 'image', 'decoratedAvatarViewModel',
            'rendererContext', 'commandContext', 'onTap', 'innertubeCommand', 'watchEndpoint', 'videoId',
        ).string();
    }

    private async postJson(url: string, params: Record<string, string>, payload: unknown): Promise<JsonPath> {
        const stage = url.slice(url.lastIndexOf('/') + 1);
        let response: TransportResponse;
        let data: unknown;
        try {
            await this.throttle.wait();
            response = await this.transport.post(url, params, payload);
            if (Math.floor(response.status / 100) !== 2) throw new ProviderTemporarilyUnavailable(`${stage} HTTP ${response.status}`);
            data = await response.json();
        } catch (error) {
            if (error instanceof ProviderTemporarilyUnavailable) throw error;
            throw new ProviderTemporarilyUnavailable(`${stage}: ${TransientFailure.detail(error)}`, { cause: error });
        }
        const json = new JsonPath(data as Json);
        if (!json.object()) throw new ProviderTemporarilyUnavailable(`${stage}: expected JSON object`);
        if (json.get('error').has()) {
            const code = json.get('error', 'code').value;
            throw new ProviderTemporarilyUnavailable(`${stage} API error ${code ?? 'None'}`);
        }
        return json;
    }
}
