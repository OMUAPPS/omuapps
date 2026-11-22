import { Models } from '@omujs/chat';
import { HttpClient, Sites } from '@omujs/iwashi';
import { Identifier, VERSION } from '@omujs/omu';

import { type ChatProvider, type ProviderContext, ProviderHttp, ProviderTemporarilyUnavailable } from '../provider';

import { type TransportResponse, YoutubeApi, type YoutubeTransport } from './youtube-api.js';
import { YoutubeChatApi } from './youtube-chat-api.js';
import { type AuthorProfiles, type RoomTimes, YoutubeRoom } from './youtube-room.js';

export class YoutubeHttpTransport implements YoutubeTransport {
    private static readonly USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36';

    public constructor(private readonly http: ProviderHttp) {}

    public get(url: string, params?: Record<string, string>): Promise<TransportResponse> {
        return this.http.fetch(YoutubeHttpTransport.withParams(url, params), {
            headers: { 'User-Agent': YoutubeHttpTransport.USER_AGENT },
        });
    }

    public post(url: string, params: Record<string, string>, payload: unknown): Promise<TransportResponse> {
        return this.http.fetch(YoutubeHttpTransport.withParams(url, params), {
            method: 'POST',
            headers: { 'User-Agent': YoutubeHttpTransport.USER_AGENT, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    }

    private static withParams(url: string, params: Record<string, string> = {}): URL {
        const target = new URL(url);
        for (const [key, value] of Object.entries(params)) {
            target.searchParams.set(key, value);
        }
        return target;
    }
}

export class YoutubeTimes implements RoomTimes {
    public constructor(private readonly api: YoutubeApi) {}

    public async update(room: Models.Room, videoId: string): Promise<void> {
        const page = await this.api.page(`${YoutubeApi.URL}/watch`, { v: videoId });
        const microformat = page.playerResponse().get('microformat', 'playerMicroformatRenderer');
        const published = microformat.get('publishDate').string();
        if (published) room.metadata.created_at = new Date(published).toISOString();
        const details = microformat.get('liveBroadcastDetails');
        const started = details.get('startTimestamp').string();
        if (started) room.metadata.started_at = new Date(started).toISOString();
        const ended = details.get('endTimestamp').string();
        if (ended) room.metadata.ended_at = new Date(ended).toISOString();
    }
}

export class YoutubeAuthorProfiles implements AuthorProfiles {
    private readonly http = new HttpClient();

    public async complete(author: Models.Author): Promise<void> {
        let profile;
        try {
            profile = await Sites.youtube.visitUrl(`https://youtube.com/channel/${author.id.path.at(-1)}`, this.http);
        } catch (error) {
            console.error('Could not fetch author metadata', error);
            return;
        }
        if (!profile) return;
        author.name = profile.name;
        author.metadata = {
            ...author.metadata,
            avatar_url: profile.profilePicture,
            url: profile.url,
            links: profile.links,
            screen_id: profile.screenId || profile.id,
        };
    }
}

export class YoutubeProvider implements ChatProvider {
    public static readonly PROVIDER: Models.Provider = new Models.Provider({
        id: Identifier.fromKey('com.omuapps:chatprovider/youtube'),
        url: 'youtube.com',
        name: 'Youtube',
        version: VERSION,
        repository_url: 'https://github.com/OMUAPPS/omuapps/tree/develop/packages-js/chat-provider/src/youtube',
        description: '',
        regex: ProviderHttp.URL_PREFIX + YoutubeApi.PATTERN.source,
    });

    public readonly provider: Models.Provider = YoutubeProvider.PROVIDER;
    private readonly api = new YoutubeApi(new YoutubeHttpTransport(new ProviderHttp(YoutubeProvider.PROVIDER)));
    private readonly times = new YoutubeTimes(this.api);
    private readonly profiles = new YoutubeAuthorProfiles();
    private readonly rooms = new Map<string, YoutubeRoom>();

    public constructor(private readonly context: ProviderContext) {}

    public async startUrl(url: string): Promise<void> {
        const videoId = YoutubeProvider.videoId(url);
        if (!videoId) return;
        await this.startVideo(videoId, undefined);
    }

    public async startChannel(channel: Models.Channel): Promise<void> {
        const videos = await this.api.fetchOnlineVideos(channel.url);
        for (const videoId of videos) {
            if (!this.context.isChannelActive(channel.id)) return;
            await this.startVideo(videoId, channel);
        }
    }

    public async stopChannel(channel: Models.Channel): Promise<void> {
        for (const room of [...this.rooms.values()]) {
            if (!room.channel?.id.isEqual(channel.id)) continue;
            await room.stop();
            if (this.rooms.get(room.room.id.key()) === room) this.rooms.delete(room.room.id.key());
        }
    }

    public async stopRoom(room: Models.Room): Promise<void> {
        const running = this.rooms.get(room.id.key());
        if (!running) return;
        await running.stop();
        if (this.rooms.get(room.id.key()) === running) this.rooms.delete(room.id.key());
    }

    public isOnline(room: Models.Room): Promise<boolean> {
        return this.api.isOnline(room.id.path.at(-1) ?? '');
    }

    private async startVideo(videoId: string, channel: Models.Channel | undefined): Promise<void> {
        const roomId = this.provider.id.join(videoId);
        const existing = this.rooms.get(roomId.key());
        if (existing && !existing.closed) return;
        let room: YoutubeRoom;
        try {
            room = await this.createRoom(roomId, videoId, channel);
        } catch (error) {
            if (error instanceof ProviderTemporarilyUnavailable) {
                console.warn(`Could not start YouTube chat for ${videoId}: ${error.message}`);
                return;
            }
            console.error(`Could not start YouTube chat for ${videoId}`, error);
            return;
        }
        this.rooms.set(roomId.key(), room);
        void room.run().catch((error) => console.error(`YouTube chat ${videoId} stopped with an error`, error));
    }

    private async createRoom(roomId: Identifier, videoId: string, channel: Models.Channel | undefined): Promise<YoutubeRoom> {
        const { chat } = this.context;
        const room = new Models.Room({
            id: roomId,
            providerId: this.provider.id,
            channelId: channel?.id.key(),
            connected: true,
            status: 'online',
            metadata: { url: `https://www.youtube.com/watch?v=${videoId}` },
            createdAt: new Date(),
        });
        const existing = await chat.rooms.get(roomId.key());
        if (existing) Object.assign(room.metadata, existing.metadata);
        const source = await YoutubeChatApi.fromVideoId(this.api, videoId);
        Object.assign(room.metadata, {
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${videoId}`,
        });
        const youtubeRoom = new YoutubeRoom(chat, room, channel, source, this.times, this.profiles);
        await this.times.update(room, videoId);
        await chat.rooms.add(room);
        return youtubeRoom;
    }

    private static videoId(url: string): string | undefined {
        let uri: URL;
        try {
            uri = new URL(url);
        } catch {
            return;
        }
        if (uri.hostname === 'youtu.be') return uri.pathname.slice(1);
        if (uri.hostname !== 'www.youtube.com' && uri.hostname !== 'youtube.com') return;
        const parts = uri.pathname.split('/').filter(Boolean);
        if (parts[0] === 'watch') return uri.searchParams.get('v') ?? undefined;
        if (parts[0] === 'live' || parts[0] === 'shorts') return parts.at(-1);
        return;
    }
}
