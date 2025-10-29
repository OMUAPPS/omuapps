import { Identifier } from '@omujs/omu';

export type ProviderJson = {
    id: string;
    url: string;
    name: string;
    version: string;
    repository_url: string;
    image_url?: string;
    description: string;
    regex: string;
};

export class Provider {
    public id: Identifier;
    public url: string;
    public name: string;
    public version: string;
    public repositoryUrl: string;
    public imageUrl?: string;
    public description: string;
    public regex: string;

    constructor(options: {
        id: Identifier;
        url: string;
        name: string;
        version: string;
        repository_url: string;
        image_url?: string;
        description: string;
        regex: string;
    }) {
        this.id = options.id;
        this.url = options.url;
        this.name = options.name;
        this.version = options.version;
        this.repositoryUrl = options.repository_url;
        this.imageUrl = options.image_url;
        this.description = options.description;
        this.regex = options.regex;
    }

    public static serialize(item: Provider): ProviderJson {
        return {
            id: item.id.key(),
            url: item.url,
            name: item.name,
            version: item.version,
            repository_url: item.repositoryUrl,
            image_url: item.imageUrl,
            description: item.description,
            regex: item.regex,
        };
    }

    public static deserialize(data: ProviderJson): Provider {
        return new Provider({
            id: Identifier.fromKey(data.id),
            url: data.url,
            name: data.name,
            version: data.version,
            repository_url: data.repository_url,
            image_url: data.image_url,
            description: data.description,
            regex: data.regex,
        });
    }

    key(): string {
        return this.id.key();
    }
}
