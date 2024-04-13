import { Identifier } from './identifier.js';
import type { Keyable } from './interface.js';
import type { Locale } from './localization/locale.js';
import type { LocalizedText } from './localization/localization.js';
import type { Model } from './model.js';

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
}

export type AppJson = {
    identifier: string;
    version?: string;
    url?: string;
    metadata?: AppMetadata;
}

export class App implements Keyable, Model<AppJson> {
    public readonly identifier: Identifier;
    public readonly version?: string;
    public readonly url?: string;
    public readonly metadata?: AppMetadata;

    constructor(identifier: Identifier, options: {
        version?: string;
        url?: string;
        metadata?: AppMetadata;
    }) {
        this.identifier = identifier;
        this.version = options.version;
        this.url = options.url;
        this.metadata = options.metadata;
    }

    key(): string {
        return this.identifier.key();
    }

    static fromJson(info: AppJson): App {
        const identifier = Identifier.fromKey(info.identifier);
        return new App(identifier, {
            version: info.version,
            url: info.url,
            metadata: info.metadata,
        });
    }

    toJson(): AppJson {
        return {
            identifier: this.identifier.key(),
            version: this.version,
            url: this.url,
            metadata: this.metadata,
        };
    }
}
