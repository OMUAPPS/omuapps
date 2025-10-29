import type { Omu } from '@omujs/omu';
import { Serializer } from '@omujs/omu';
import { EndpointType } from '@omujs/omu/api/endpoint';
import type { Signal } from '@omujs/omu/api/signal';
import { SignalPermissions, SignalType } from '@omujs/omu/api/signal';
import type { Table } from '@omujs/omu/api/table';
import { TableType } from '@omujs/omu/api/table';

import { PLUGIN_ID } from './const';
import type { EventHandler, EventSource } from './event';
import { EventRegistry } from './event';
import { Author, Channel, Message, Provider, Reaction, Room, Vote } from './models';
import {
    CHAT_CHANNEL_TREE_PERMISSION_ID,
    CHAT_PERMISSION_ID,
    CHAT_READ_PERMISSION_ID,
    CHAT_WRITE_PERMISSION_ID,
} from './permissions';

const MESSAGE_TABLE_TYPE = TableType.createJson(PLUGIN_ID, {
    name: 'messages',
    serializer: Message,
    key: (item) => item.key(),
    permissions: {
        all: CHAT_PERMISSION_ID,
        read: CHAT_READ_PERMISSION_ID,
        write: CHAT_WRITE_PERMISSION_ID,
    },
});
const AUTHOR_TABLE_TYPE = TableType.createJson(PLUGIN_ID, {
    name: 'authors',
    serializer: Author,
    key: (item) => item.key(),
    permissions: {
        all: CHAT_PERMISSION_ID,
        read: CHAT_READ_PERMISSION_ID,
        write: CHAT_WRITE_PERMISSION_ID,
    },
});
const CHANNEL_TABLE_TYPE = TableType.createJson(PLUGIN_ID, {
    name: 'channels',
    serializer: Channel,
    key: (item) => item.key(),
    permissions: {
        all: CHAT_PERMISSION_ID,
        read: CHAT_READ_PERMISSION_ID,
        write: CHAT_WRITE_PERMISSION_ID,
    },
});
const PROVIDER_TABLE_TYPE = TableType.createJson(PLUGIN_ID, {
    name: 'providers',
    serializer: Provider,
    key: (item) => item.key(),
    permissions: {
        all: CHAT_PERMISSION_ID,
        read: CHAT_READ_PERMISSION_ID,
        write: CHAT_WRITE_PERMISSION_ID,
    },
});
const ROOM_TABLE_TYPE = TableType.createJson(PLUGIN_ID, {
    name: 'rooms',
    serializer: Room,
    key: (item) => item.key(),
    permissions: {
        all: CHAT_PERMISSION_ID,
        read: CHAT_READ_PERMISSION_ID,
        write: CHAT_WRITE_PERMISSION_ID,
    },
});
const VOTE_TABLE_TYPE = TableType.createJson(PLUGIN_ID, {
    name: 'votes',
    serializer: Vote,
    key: (item) => item.key(),
    permissions: {
        all: CHAT_PERMISSION_ID,
        read: CHAT_READ_PERMISSION_ID,
        write: CHAT_WRITE_PERMISSION_ID,
    },
});
const CREATE_CHANNEL_TREE_ENDPOINT = EndpointType.createJson(PLUGIN_ID, {
    name: 'create_channel_tree',
    requestSerializer: Serializer.noop<string>(),
    responseSerializer: Serializer.of(Channel).toArray(),
    permissionId: CHAT_CHANNEL_TREE_PERMISSION_ID,
});
const REACTION_SIGNAL = SignalType.createJson(PLUGIN_ID, {
    name: 'reaction',
    serializer: Reaction,
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

    private constructor(private readonly omu: Omu) {
        omu.sessions.require(PLUGIN_ID);
        omu.permissions.require(CHAT_PERMISSION_ID);
        this.eventRegistry = new EventRegistry(this);
        this.messages = omu.tables.get(MESSAGE_TABLE_TYPE);
        this.authors = omu.tables.get(AUTHOR_TABLE_TYPE);
        this.channels = omu.tables.get(CHANNEL_TABLE_TYPE);
        this.providers = omu.tables.get(PROVIDER_TABLE_TYPE);
        this.rooms = omu.tables.get(ROOM_TABLE_TYPE);
        this.votes = omu.tables.get(VOTE_TABLE_TYPE);
        this.reactionSignal = omu.signals.get(REACTION_SIGNAL);
        this.messages.setCacheSize(1000);
        this.authors.setCacheSize(500);
    }

    public static create(omu: Omu): Chat {
        if (omu.ready) {
            throw new Error('OMU instance is already started');
        }
        return new Chat(omu);
    }

    public async createChannelTree(url: string): Promise<Channel[]> {
        return await this.omu.endpoints.call(CREATE_CHANNEL_TREE_ENDPOINT, url);
    }

    public on<P extends Array<any>>(event: EventSource<P>, handler: EventHandler<P>): void {
        this.eventRegistry.register(event, handler);
    }
}
