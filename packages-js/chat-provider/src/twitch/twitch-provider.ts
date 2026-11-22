import { Models } from '@omujs/chat';
import { Identifier, VERSION } from '@omujs/omu';

import { type ChatProvider, type ProviderContext, ProviderHttp } from '../provider';

import { TwitchApi } from './twitch-api.js';
import { TwitchChannel } from './twitch-channel.js';
import { IrcCommand, type IrcPacket, TwitchIrc } from './twitch-irc.js';
import { TwitchMessages } from './twitch-messages.js';
import { TwitchPubSub } from './twitch-pubsub.js';

class TwitchConnection {
    private constructor(
        public readonly api: TwitchApi,
        public readonly pubsub: TwitchPubSub,
        public readonly irc: TwitchIrc,
    ) {}

    public static async open(http: ProviderHttp, irc: TwitchIrc): Promise<TwitchConnection> {
        const api = await TwitchApi.create(http);
        const pubsub = new TwitchPubSub();
        await pubsub.connect();
        await irc.connect();
        return new TwitchConnection(api, pubsub, irc);
    }
}

export class TwitchProvider implements ChatProvider {
    public static readonly PROVIDER: Models.Provider = new Models.Provider({
        id: Identifier.fromKey('com.omuapps:chatprovider/twitch'),
        url: 'twitch.tv',
        name: 'Twitch',
        version: VERSION,
        repository_url: 'https://github.com/OMUAPPS/omuapps/tree/develop/packages-js/chat-provider/src/twitch',
        description: '',
        regex: ProviderHttp.URL_PREFIX + String.raw`twitch\.tv\/(?<id>[\w=-]+)`,
    });

    public readonly provider: Models.Provider = TwitchProvider.PROVIDER;
    private readonly http = new ProviderHttp(TwitchProvider.PROVIDER);
    private readonly channelIds = new Map<string, number>();
    private readonly channels = new Map<number, TwitchChannel>();
    private connection: Promise<TwitchConnection> | undefined;

    public constructor(private readonly context: ProviderContext) {}

    public async startUrl(): Promise<void> {}

    public async startChannel(channel: Models.Channel): Promise<void> {
        const connection = await this.connect();
        const channelId = await this.channelId(connection, channel.id);
        if (this.channels.has(channelId)) return;
        const opened = await TwitchChannel.open(this.provider, connection.api, connection.pubsub, this.context.chat, channel, channelId);
        this.channels.set(channelId, opened);
        connection.irc.join(opened.login);
    }

    public async stopChannel(channel: Models.Channel): Promise<void> {
        if (!this.connection) return;
        const connection = await this.connection;
        const channelId = await this.channelId(connection, channel.id);
        const opened = this.channels.get(channelId);
        if (!opened) return;
        this.channels.delete(channelId);
        opened.room.connected = false;
        opened.room.status = 'offline';
        await this.context.chat.rooms.update(opened.room);
        opened.close();
        connection.irc.part(opened.login);
    }

    public async stopRoom(): Promise<void> {}

    public async isOnline(room: Models.Room): Promise<boolean> {
        if (!room.channelId || !this.connection) return false;
        const channelId = await this.channelId(await this.connection, Identifier.fromKey(room.channelId));
        return this.channels.get(channelId)?.room.id.isEqual(room.id) ?? false;
    }

    private connect(): Promise<TwitchConnection> {
        this.connection ??= TwitchConnection.open(this.http, new TwitchIrc({
            PRIVMSG: (packet) => this.handleMessage(packet),
            CLEARMSG: (packet) => this.handleClear(packet),
            PING: () => this.connection?.then((connection) => connection.irc.send(IrcCommand.pong())),
            CAP: (packet) => console.info(`[Twitch] Capabilities: ${packet.text}`),
            JOIN: (packet) => console.info(`[Twitch] Joined as ${packet.sender}`),
            PART: (packet) => console.info(`[Twitch] Parted as ${packet.sender}`),
            ROOMSTATE: () => {},
            USERNOTICE: () => {},
        })).catch((error) => {
            this.connection = undefined;
            throw error;
        });
        return this.connection;
    }

    private async channelId(connection: TwitchConnection, id: Identifier): Promise<number> {
        const login = id.path.at(-1) ?? '';
        const cached = this.channelIds.get(login);
        if (cached !== undefined) return cached;
        const channelId = await connection.api.channelId(login);
        this.channelIds.set(login, channelId);
        return channelId;
    }

    private async handleMessage(packet: IrcPacket): Promise<void> {
        if (packet.args.length === 0) return;
        const opened = this.channels.get(Number(packet.params['room-id']));
        if (!opened) {
            console.warn(`[Twitch] No channel for room: ${packet.params['room-id']}`);
            return;
        }
        const { room } = opened;
        const senderLogin = packet.sender.split('!')[0];
        const author = await this.author(packet.params['user-id'], opened, senderLogin);
        const message = new Models.Message({
            id: room.id.join(packet.params.id),
            roomId: room.id,
            authorId: author.id,
            content: TwitchMessages.parse(packet.text, packet.params.emotes ?? ''),
            createdAt: new Date(Number(packet.params['tmi-sent-ts'])),
            deleted: false,
        });
        room.metadata.first_message_id ??= message.id.key();
        room.metadata.last_message_id = message.id.key();
        await this.context.chat.rooms.update(room);
        await this.context.chat.messages.add(message);
    }

    private async handleClear(packet: IrcPacket): Promise<void> {
        if (packet.args.length === 0) return;
        const opened = this.channels.get(Number(packet.params['room-id']));
        if (!opened) return;
        const message = await this.context.chat.messages.get(opened.room.id.join(packet.params['target-msg-id']).key());
        if (!message) return;
        message.deleted = true;
        await this.context.chat.messages.update(message);
    }

    private async author(userId: string, opened: TwitchChannel, senderLogin: string): Promise<Models.Author> {
        const authorId = opened.channel.id.join(userId);
        const existing = await this.context.chat.authors.get(authorId.key());
        if (existing) return existing;
        const connection = await this.connect();
        const card = await connection.api.viewerCard(opened.login, senderLogin);
        const roles = (card.channelViewer.earnedBadges ?? []).map((badge) => new Models.Role({
            id: badge.setID,
            name: badge.title,
            iconUrl: badge.image4x,
            isModerator: false,
            isOwner: false,
        }));
        const author = new Models.Author({
            providerId: this.provider.id,
            id: authorId,
            name: card.targetUser.displayName,
            avatarUrl: card.targetUser.profileImageURL,
            roles,
            metadata: {
                avatar_url: card.targetUser.profileImageURL,
                screen_id: senderLogin,
                url: `https://www.twitch.tv/${senderLogin}`,
            },
        });
        await this.context.chat.authors.add(author);
        return author;
    }
}
