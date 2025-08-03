import { Identifier } from '@omujs/omu/identifier.js';
import type { Keyable, Timestamped } from '@omujs/omu/interface.js';

export type MetadataJson = {
    title?: string;
    description?: string;
    url?: string;
    thumbnail?: string;
    viewers?: number;
    created_at?: string;
    started_at?: string;
    ended_at?: string;
    first_message_id?: string;
    last_message_id?: string;
};

export type Status = 'online' | 'reserved' | 'offline';

export type RoomJson = {
    id: string;
    provider_id: string;
    connected: boolean;
    status: Status;
    metadata: MetadataJson;
    channel_id?: string;
    created_at: string; // ISO 8601 date string
};

export class Room implements Keyable, Timestamped {
    public id: Identifier;
    public providerId: Identifier;
    public connected: boolean;
    public status: Status;
    public metadata: MetadataJson;
    public channelId?: string;
    public createdAt: Date;

    constructor(options: {
        id: Identifier;
        providerId: Identifier;
        connected: boolean;
        status: Status;
        metadata: MetadataJson;
        channelId?: string;
        createdAt: Date;
    }) {
        this.id = options.id;
        this.providerId = options.providerId;
        this.connected = options.connected;
        this.status = options.status;
        this.metadata = options.metadata;
        this.channelId = options.channelId;
        this.createdAt = options.createdAt;
    }

    public static deserialize(options: RoomJson): Room {
        return new Room({
            id: Identifier.fromKey(options.id),
            providerId: Identifier.fromKey(options.provider_id),
            connected: options.connected,
            status: options.status,
            metadata: options.metadata,
            channelId: options.channel_id,
            createdAt: new Date(options.created_at),
        });
    }

    public static serialize(item: Room): RoomJson {
        return {
            id: item.id.key(),
            provider_id: item.providerId.key(),
            connected: item.connected,
            status: item.status,
            metadata: item.metadata,
            channel_id: item.channelId,
            created_at: item.createdAt.toISOString(),
        };
    }

    key(): string {
        return this.id.key();
    }
}
