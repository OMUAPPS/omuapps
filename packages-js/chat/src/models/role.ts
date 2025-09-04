export type RoleJson = {
    id?: string;
    name: string;
    is_owner: boolean;
    is_moderator: boolean;
    icon_url?: string;
    color?: string;
};

export class Role {
    id?: string;
    name: string;
    isOwner: boolean;
    isModerator: boolean;
    iconUrl?: string;
    color?: string;

    constructor(options: {
        id?: string;
        name: string;
        isOwner: boolean;
        isModerator: boolean;
        iconUrl?: string;
        color?: string;
    }) {
        this.id = options.id;
        this.name = options.name;
        this.isOwner = options.isOwner;
        this.isModerator = options.isModerator;
        this.iconUrl = options.iconUrl;
        this.color = options.color;
    }

    static fromJson(json: RoleJson): Role {
        return new Role({
            id: json.id,
            name: json.name,
            isOwner: json.is_owner,
            isModerator: json.is_moderator,
            iconUrl: json.icon_url,
            color: json.color,
        });
    }

    toJson(): RoleJson {
        return {
            id: this.id,
            name: this.name,
            color: this.color,
            icon_url: this.iconUrl,
            is_owner: this.isOwner,
            is_moderator: this.isModerator,
        };
    }
}
