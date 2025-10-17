import { Identifier, IntoId } from './identifier';
import type { Locale } from './localization/locale.js';
import type { LocalizedText } from './localization/localization.js';

export type AppMetadata = {
    locale: Locale;
    name?: LocalizedText;
    icon?: LocalizedText;
    description?: LocalizedText;
    image?: LocalizedText;
    site?: LocalizedText;
    repository?: LocalizedText;
    authors?: LocalizedText;
    license?: LocalizedText;
    tags?: string[];
};

export type AppType = 'app' | 'remote' | 'plugin' | 'dashboard';

export type AppJson = {
    id: string;
    type: AppType;
    parent_id?: string;
    version?: string;
    url?: string;
    metadata?: AppMetadata;
};

export class App {
    public readonly id: Identifier;
    public readonly type: AppType;
    public readonly parentId?: Identifier;
    public readonly version?: string;
    public readonly url?: string;
    public readonly metadata?: AppMetadata;

    constructor(id: IntoId, options: {
        type?: AppType;
        parentId?: IntoId;
        version?: string;
        url?: string;
        metadata?: AppMetadata;
    }) {
        this.id = Identifier.from(id);
        this.parentId = Identifier.fromOptional(options.parentId);
        this.version = options.version;
        this.url = options.url;
        this.metadata = options.metadata;
        this.type = options.type ?? 'app';
    }

    public static deserialize(info: AppJson): App {
        const id = Identifier.fromKey(info.id);
        return new App(id, {
            parentId: Identifier.fromOptional(info.parent_id),
            version: info.version,
            url: info.url,
            type: info.type,
            metadata: info.metadata,
        });
    }

    public static serialize(data: App): AppJson {
        return {
            id: data.id.key(),
            type: data.type,
            parent_id: data.parentId?.key(),
            version: data.version,
            url: data.url,
            metadata: data.metadata,
        };
    }

    public join(...paths: string[]): App {
        return new App(this.id.join(...paths), {
            parentId: this.parentId,
            version: this.version,
            url: this.url,
            type: this.type,
            metadata: this.metadata,
        });
    }
}
