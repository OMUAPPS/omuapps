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
    parent_id?: string;
    version?: string;
    url?: string;
    type?: AppType;
    metadata?: AppMetadata;
};

export class App {
    public readonly id: Identifier;
    public readonly parentId?: Identifier;
    public readonly version?: string;
    public readonly url?: string;
    public readonly metadata?: AppMetadata;
    public readonly type?: AppType;

    constructor(id: IntoId, options: {
        parentId?: IntoId;
        version?: string;
        url?: string;
        metadata?: AppMetadata;
        type?: AppType;
    }) {
        this.id = Identifier.from(id);
        this.parentId = Identifier.fromOptional(options.parentId);
        this.version = options.version;
        this.url = options.url;
        this.metadata = options.metadata;
        this.type = options.type;
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
            version: data.version,
            url: data.url,
            type: data.type,
            metadata: data.metadata,
        };
    }
}
