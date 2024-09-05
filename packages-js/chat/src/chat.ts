import type { Client } from '@omujs/omu/client.js';
import { EndpointType } from '@omujs/omu/extension/endpoint/endpoint.js';
import type { Signal } from '@omujs/omu/extension/signal/signal.js';
import { SignalPermissions, SignalType } from '@omujs/omu/extension/signal/signal.js';
import type { Table } from '@omujs/omu/extension/table/index.js';
import { TableType } from '@omujs/omu/extension/table/index.js';
import { Serializer } from '@omujs/omu/serializer.js';

import { IDENTIFIER } from './const.js';
import type { EventHandler, EventSource } from './event/event.js';
import { EventRegistry } from './event/event.js';
import { Author, Channel, Message, Provider, Reaction, Room, Vote } from './models/index.js';
import {
    CHAT_CHANNEL_TREE_PERMISSION_ID,
    CHAT_PERMISSION_ID,
    CHAT_READ_PERMISSION_ID,
    CHAT_WRITE_PERMISSION_ID,
} from './permissions.js';

const MESSAGE_TABLE_TYPE = TableType.createModel(IDENTIFIER, {
    name: 'messages',
    model: Message,
    permissions: {
        all: CHAT_PERMISSION_ID,
        read: CHAT_READ_PERMISSION_ID,
        write: CHAT_WRITE_PERMISSION_ID,
    },
});
const AUTHOR_TABLE_TYPE = TableType.createModel(IDENTIFIER, {
    name: 'authors',
    model: Author,
    permissions: {
        all: CHAT_PERMISSION_ID,
        read: CHAT_READ_PERMISSION_ID,
        write: CHAT_WRITE_PERMISSION_ID,
    },
});
const CHANNEL_TABLE_TYPE = TableType.createModel(IDENTIFIER, {
    name: 'channels',
    model: Channel,
    permissions: {
        all: CHAT_PERMISSION_ID,
        read: CHAT_READ_PERMISSION_ID,
        write: CHAT_WRITE_PERMISSION_ID,
    },
});
const PROVIDER_TABLE_TYPE = TableType.createModel(IDENTIFIER, {
    name: 'providers',
    model: Provider,
    permissions: {
        all: CHAT_PERMISSION_ID,
        read: CHAT_READ_PERMISSION_ID,
        write: CHAT_WRITE_PERMISSION_ID,
    },
});
const ROOM_TABLE_TYPE = TableType.createModel(IDENTIFIER, {
    name: 'rooms',
    model: Room,
    permissions: {
        all: CHAT_PERMISSION_ID,
        read: CHAT_READ_PERMISSION_ID,
        write: CHAT_WRITE_PERMISSION_ID,
    },
});
const VOTE_TABLE_TYPE = TableType.createModel(IDENTIFIER, {
    name: 'votes',
    model: Vote,
    permissions: {
        all: CHAT_PERMISSION_ID,
        read: CHAT_READ_PERMISSION_ID,
        write: CHAT_WRITE_PERMISSION_ID,
    },
});
const CREATE_CHANNEL_TREE_ENDPOINT = EndpointType.createJson(IDENTIFIER, {
    name: 'create_channel_tree',
    requestSerializer: Serializer.noop<string>(),
    responseSerializer: Serializer.model(Channel).toArray(),
    permissionId: CHAT_CHANNEL_TREE_PERMISSION_ID,
});
const REACTION_SIGNAL = SignalType.createJson(IDENTIFIER, {
    name: 'reaction',
    serializer: Serializer.model(Reaction),
    permissions: new SignalPermissions(CHAT_PERMISSION_ID),
});

export class Chat {
    public readonly messages: Table<Message>;
    public readonly authors: Table<Author>;
    public readonly channels: Table<Channel>;
    public readonly providers: Table<Provider>;
    public readonly rooms: Table<Room>;
    public readonly votes: Table<Vote>;
    public readonly reactionSignal: Signal<Reaction>;
    private readonly eventRegistry: EventRegistry;

    constructor(private readonly client: Client) {
        client.server.require(IDENTIFIER);
        client.permissions.require(CHAT_PERMISSION_ID);
        this.eventRegistry = new EventRegistry(this);
        this.messages = client.tables.get(MESSAGE_TABLE_TYPE);
        this.authors = client.tables.get(AUTHOR_TABLE_TYPE);
        this.channels = client.tables.get(CHANNEL_TABLE_TYPE);
        this.providers = client.tables.get(PROVIDER_TABLE_TYPE);
        this.rooms = client.tables.get(ROOM_TABLE_TYPE);
        this.votes = client.tables.get(VOTE_TABLE_TYPE);
        this.reactionSignal = client.signals.get(REACTION_SIGNAL);
        this.messages.setCacheSize(1000);
        this.authors.setCacheSize(500);
    }

    public async createChannelTree(url: string): Promise<Channel[]> {
        return await this.client.endpoints.call(CREATE_CHANNEL_TREE_ENDPOINT, url);
    }

    public on<P extends Array<any>>(event: EventSource<P>, handler: EventHandler<P>): void {
        this.eventRegistry.register(event, handler);
    }
}
