import { Identifier } from '@omujs/omu/identifier.js';
import type { Keyable } from '@omujs/omu/interface.js';

export type ChannelJson = {
    provider_id: string;
    id: string;
    url: string;
    name: string;
    description: string;
    active: boolean;
    icon_url: string;
};

export class Channel implements Keyable {
    providerId: Identifier;
    id: Identifier;
    url: string;
    name: string;
    description: string;
    active: boolean;
    iconUrl: string;

    constructor(option: {
        providerId: Identifier;
        id: Identifier;
        url: string;
        name: string;
        description: string;
        active: boolean;
        iconUrl: string;
    }) {
        this.providerId = option.providerId;
        this.id = option.id;
        this.url = option.url;
        this.name = option.name;
        this.description = option.description;
        this.active = option.active;
        this.iconUrl = option.iconUrl;
    }

    public static deserialize(json: ChannelJson): Channel {
        return new Channel({
            providerId: Identifier.fromKey(json.provider_id),
            id: Identifier.fromKey(json.id),
            url: json.url,
            name: json.name,
            description: json.description,
            active: json.active,
            iconUrl: json.icon_url,
        });
    }

    key(): string {
        return this.id.key();
    }

    public static serialize(item: Channel): ChannelJson {
        return {
            provider_id: item.providerId.key(),
            id: item.id.key(),
            url: item.url,
            name: item.name,
            description: item.description,
            active: item.active,
            icon_url: item.iconUrl,
        };
    }
}
