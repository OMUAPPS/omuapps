import { Identifier } from '@omujs/omu';
import type { Keyable } from '@omujs/omu/interface.js';

export type Choice = {
    text: string;
    ratio: number;
    count?: number;
};

export type VoteJson = {
    id: string;
    room_id: string;
    title: string;
    choices: Choice[];
    ended: boolean;
    total: number | null;
};

export class Vote implements Keyable {
    public readonly id: Identifier;
    public readonly roomId: Identifier;
    public title: string;
    public choices: Choice[];
    public ended: boolean;
    public total: number | null;

    constructor(options: {
        id: Identifier;
        roomId: Identifier;
        title: string;
        choices: Choice[];
        ended: boolean;
        total: number | null;
    }) {
        this.id = options.id;
        this.roomId = options.roomId;
        this.title = options.title;
        this.choices = options.choices;
        this.ended = options.ended;
        this.total = options.total;
    }

    public static deserialize(options: VoteJson): Vote {
        return new Vote({
            id: Identifier.fromKey(options.id),
            roomId: Identifier.fromKey(options.room_id),
            title: options.title,
            choices: options.choices,
            ended: options.ended,
            total: options.total,
        });
    }

    public static serialize(item: Vote): VoteJson {
        return {
            id: item.id.key(),
            room_id: item.roomId.key(),
            title: item.title,
            choices: item.choices,
            ended: item.ended,
            total: item.total,
        };
    }

    public key(): string {
        return this.id.key();
    }
}
