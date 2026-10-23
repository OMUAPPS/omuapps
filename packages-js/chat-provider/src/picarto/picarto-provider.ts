import { Models } from '@omujs/chat';
import { Identifier, VERSION } from '@omujs/omu';

import { type ChatProvider, type ProviderContext, ProviderHttp } from '../provider';

import { PicartoChat } from './picarto-chat.js';
import { PicartoEmoticons } from './picarto-emoticons.js';

export class PicartoProvider implements ChatProvider {
    public static readonly PROVIDER: Models.Provider = new Models.Provider({
        id: Identifier.fromKey('com.omuapps:chatprovider/picarto'),
        url: 'picarto.tv',
        name: 'Picarto',
        version: VERSION,
        repository_url: 'https://github.com/OMUAPPS/omuapps/tree/develop/packages-js/chat-provider/src/picarto',
        description: '',
        regex: ProviderHttp.URL_PREFIX + String.raw`picarto\.tv\/(?<id>[\w=-]+)`,
    });

    public readonly provider: Models.Provider = PicartoProvider.PROVIDER;
    private readonly http = new ProviderHttp(PicartoProvider.PROVIDER);
    private readonly chats = new Map<string, PicartoChat>();
    private emoticons: Promise<PicartoEmoticons> | undefined;

    public constructor(private readonly context: ProviderContext) {}

    public async startUrl(url: string): Promise<void> {
        const name = PicartoProvider.channelName(url);
        if (!name) return;
        await this.connect(new Models.Channel({
            providerId: this.provider.id,
            id: this.provider.id.join(name),
            url,
            name,
            active: true,
            description: '',
            iconUrl: '',
        }));
    }

    public async startChannel(channel: Models.Channel): Promise<void> {
        await this.connect(channel);
    }

    public async stopChannel(channel: Models.Channel): Promise<void> {
        this.chats.get(channel.id.key())?.stop();
        this.chats.delete(channel.id.key());
    }

    public async stopRoom(room: Models.Room): Promise<void> {
        room.connected = false;
        room.status = 'offline';
        await this.context.chat.rooms.update(room);
        if (!room.channelId) return;
        this.chats.get(room.channelId)?.stop();
        this.chats.delete(room.channelId);
    }

    public async isOnline(room: Models.Room): Promise<boolean> {
        if (!room.channelId) return false;
        const chat = this.chats.get(room.channelId);
        if (!chat) return false;
        if (!chat.closed) return true;
        this.chats.delete(room.channelId);
        return false;
    }

    private async connect(channel: Models.Channel): Promise<void> {
        if (this.chats.has(channel.id.key())) return;
        const chat = await PicartoChat.connect(this.http, this.context.chat, this.provider, channel, await this.loadEmoticons());
        this.chats.set(channel.id.key(), chat);
    }

    private loadEmoticons(): Promise<PicartoEmoticons> {
        this.emoticons ??= PicartoEmoticons.load(this.http).catch((error) => {
            console.warn('[Picarto] Failed to load emoticons', error);
            this.emoticons = undefined;
            return PicartoEmoticons.empty();
        });
        return this.emoticons;
    }

    private static channelName(url: string): string | undefined {
        let uri: URL;
        try {
            uri = new URL(url);
        } catch {
            return;
        }
        if (uri.hostname !== 'picarto.tv') return;
        return uri.pathname.split('/').find(Boolean);
    }
}
