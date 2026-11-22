import { type Chat, Models } from '@omujs/chat';

import type { TwitchApi } from './twitch-api.js';
import type { TwitchPubSub } from './twitch-pubsub.js';

type Playback = { type: 'stream-up' } | { type: 'stream-down' } | { type: 'viewcount'; viewers: number } | { type: string };

export class TwitchChannel {
    private constructor(
        public readonly channel: Models.Channel,
        public readonly login: string,
        public readonly channelId: number,
        public room: Models.Room,
        private readonly provider: Models.Provider,
        private readonly api: TwitchApi,
        private readonly pubsub: TwitchPubSub,
        private readonly chat: Chat,
    ) {}

    public static async open(
        provider: Models.Provider,
        api: TwitchApi,
        pubsub: TwitchPubSub,
        chat: Chat,
        channel: Models.Channel,
        channelId: number,
    ): Promise<TwitchChannel> {
        const login = channel.id.path.at(-1) ?? '';
        const room = await TwitchChannel.liveRoom(provider, api, channel, login) ?? TwitchChannel.offlineRoom(provider, login);
        const opened = new TwitchChannel(channel, login, channelId, room, provider, api, pubsub, chat);
        pubsub.subscribe(`broadcast-settings-update.${channelId}`, () => {});
        pubsub.subscribe(`video-playback-by-id.${channelId}`, (message) => opened.handlePlayback(message as Playback));
        return opened;
    }

    public close(): void {
        this.pubsub.unsubscribe(`broadcast-settings-update.${this.channelId}`);
        this.pubsub.unsubscribe(`video-playback-by-id.${this.channelId}`);
    }

    private async handlePlayback(data: Playback): Promise<void> {
        if (data.type === 'stream-up') {
            const room = await TwitchChannel.liveRoom(this.provider, this.api, this.channel, this.login);
            if (!room) {
                console.warn(`[Twitch] No room found for ${this.login}`);
                return;
            }
            this.room = room;
            await this.chat.rooms.add(room);
            return;
        }
        if (data.type === 'stream-down') {
            this.room.connected = false;
            this.room.status = 'offline';
            this.room.metadata.thumbnail = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${this.login}-1280x720.jpg`;
            const panel = await this.api.aboutPanel(this.login);
            const videoId = panel.user?.videos?.edges?.[0]?.node?.id;
            if (videoId) this.room.metadata.url = `https://www.twitch.tv/videos/${videoId}`;
            await this.chat.rooms.update(this.room);
            this.room = TwitchChannel.offlineRoom(this.provider, this.login);
            return;
        }
        if (data.type === 'viewcount' && 'viewers' in data) {
            this.room.metadata.viewers = data.viewers;
            await this.chat.rooms.update(this.room);
            return;
        }
        console.warn(`[Twitch] Unexpected data type: ${data.type}`);
    }

    private static async liveRoom(provider: Models.Provider, api: TwitchApi, channel: Models.Channel, login: string): Promise<Models.Room | undefined> {
        const info = await api.streamMetadata(login);
        if (!info) {
            console.warn(`[Twitch] No stream metadata found for ${login}`);
            return;
        }
        const { lastBroadcast, stream } = info;
        if (!stream || !lastBroadcast) return;
        return new Models.Room({
            status: 'online',
            providerId: provider.id,
            channelId: channel.id.key(),
            id: provider.id.join(info.channel.id, lastBroadcast.id),
            connected: true,
            metadata: {
                url: `https://www.twitch.tv/${login}`,
                thumbnail: `https://static-cdn.jtvnw.net/previews-ttv/live_user_${login}-440x248.jpg`,
                created_at: new Date(stream.createdAt).toISOString(),
                title: lastBroadcast.title ?? '',
                description: stream.game?.name,
            },
            createdAt: new Date(),
        });
    }

    private static offlineRoom(provider: Models.Provider, login: string): Models.Room {
        return new Models.Room({
            status: 'offline',
            providerId: provider.id,
            id: provider.id.join(login),
            connected: false,
            metadata: {
                url: `https://www.twitch.tv/${login}`,
                thumbnail: `https://static-cdn.jtvnw.net/previews-ttv/live_user_${login}-440x248.jpg`,
                title: `${login} is offline`,
                description: '',
            },
            createdAt: new Date(),
        });
    }
}
