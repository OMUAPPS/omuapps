import { Identifier } from '@omujs/omu/identifier.js';
import type { Keyable, Timestamped } from '@omujs/omu/interface.js';
import type { Model } from '@omujs/omu/model.js';

import * as content from './content.js';
import type { GiftJson } from './gift.js';
import { Gift } from './gift.js';
import type { PaidJson } from './paid.js';
import { Paid } from './paid.js';

export type MessageJson = {
    room_id: string;
    id: string;
    created_at: string; // ISO 8601 date string
    author_id?: string;
    content?: content.ComponentJson;
    paid?: PaidJson;
    gifts?: GiftJson[];
    deleted?: boolean;
};

export class Message implements Model<MessageJson>, Keyable, Timestamped {
    public roomId: Identifier;
    public id: Identifier;
    public authorId?: Identifier;
    public content?: content.Component;
    public paid?: Paid;
    public gifts?: Gift[];
    public createdAt: Date;
    public deleted?: boolean;

    constructor(options: {
        roomId: Identifier;
        id: Identifier;
        authorId?: Identifier;
        createdAt: Date;
        content?: content.Component;
        paid?: Paid;
        gifts?: Gift[];
        deleted?: boolean;
    }) {
        if (!(options.createdAt instanceof Date)) {
            throw new Error('created_at must be a Date');
        }
        this.roomId = options.roomId;
        this.id = options.id;
        this.authorId = options.authorId;
        this.content = options.content;
        this.paid = options.paid;
        this.gifts = options.gifts;
        this.createdAt = options.createdAt;
        this.deleted = options.deleted;
    }

    static fromJson(info: MessageJson): Message {
        return new Message({
            roomId: Identifier.fromKey(info.room_id),
            id: Identifier.fromKey(info.id),
            authorId: info.author_id ? Identifier.fromKey(info.author_id) : undefined,
            content: info.content && content.deserialize(info.content),
            paid: info.paid && Paid.fromJson(info.paid),
            gifts: info.gifts?.map((gift) => Gift.fromJson(gift)),
            createdAt: new Date(info.created_at),
            deleted: info.deleted,
        });
    }

    get text(): string {
        if (!this.content) {
            return '';
        }
        return this.content.toString();
    }

    key(): string {
        return this.id.key();
    }

    toJson(): MessageJson {
        return {
            room_id: this.roomId.key(),
            id: this.id.key(),
            author_id: this.authorId?.key(),
            created_at: this.createdAt.toISOString(),
            content: this.content && content.serialize(this.content),
            paid: this.paid?.toJson(),
            gifts: this.gifts?.map((gift) => gift.toJson()),
            deleted: this.deleted,
        };
    }
}
