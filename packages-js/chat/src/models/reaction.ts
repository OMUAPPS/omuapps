import { Identifier } from '@omujs/omu';

export type ReactionJson = {
    room_id: string;
    reactions: {
        [key: string]: number;
    };
};

export class Reaction {
    public roomId: Identifier;
    public reactions: {
        [key: string]: number;
    };

    constructor(options: {
        roomId: Identifier;
        reactions: {
            [key: string]: number;
        };
    }) {
        this.roomId = options.roomId;
        this.reactions = options.reactions;
    }

    public static deserialize(data: ReactionJson): Reaction {
        return new Reaction({
            roomId: Identifier.fromKey(data.room_id),
            reactions: data.reactions,
        });
    }

    public static serialize(item: Reaction): ReactionJson {
        return {
            room_id: item.roomId.key(),
            reactions: item.reactions,
        };
    }
}
