import { makeRegistryWritable } from '$lib/helper.js';
import { Chat, models } from '@omujs/chat';
import { Provider } from '@omujs/chat/models/provider.js';
import type { Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/extension/registry/registry.js';
import { TableType, type Table } from '@omujs/omu/extension/table/index.js';
import { Identifier } from '@omujs/omu/identifier.js';
import type { Keyable } from '@omujs/omu/interface.js';
import type { Model } from '@omujs/omu/model.js';
import { writable, type Writable } from 'svelte/store';
import { APP_ID } from './app.js';

const PLUGIN_IDENTIFIER = APP_ID.join('plugin');

export type TextPattern = {
    type: 'text';
    text: string;
};

export type ImagePattern = {
    type: 'image';
    id: string;
};

export type RegexPattern = {
    type: 'regex';
    regex: string;
};

export type Pattern = TextPattern | ImagePattern | RegexPattern;

export interface EmojiData {
    readonly id: string;
    asset: string;
    patterns: Pattern[];
}

export class Emoji implements Model<EmojiData>, Keyable {
    readonly id: string;
    asset: Identifier;
    patterns: Pattern[];

    constructor(options: { id: string; asset: Identifier; patterns: Pattern[] }) {
        this.id = options.id;
        this.asset = options.asset;
        this.patterns = options.patterns;
    }

    public getPatternText() {
        return this.patterns
            .map((pattern) => {
                if (pattern.type === 'text') {
                    return pattern.text;
                }
                if (pattern.type === 'image') {
                    return `:${pattern.id}:`;
                }
                if (pattern.type === 'regex') {
                    return pattern.regex;
                }
                return '';
            })
            .join(', ');
    }

    key() {
        return this.id;
    }

    static fromJson(data: EmojiData) {
        return new Emoji({
            id: data.id,
            asset: Identifier.fromKey(data.asset),
            patterns: data.patterns,
        });
    }

    toJson() {
        return {
            id: this.id,
            asset: this.asset.key(),
            patterns: this.patterns,
        };
    }
}

export const EMOJI_TABLE = TableType.createModel(PLUGIN_IDENTIFIER, {
    name: 'emoji',
    model: Emoji,
});

export type Config = {
    active: boolean;
};

const CONFIG_REGISTRY_TYPE = RegistryType.createJson<Config>(PLUGIN_IDENTIFIER, {
    name: 'config',
    defaultValue: {
        active: true,
    },
});

export class EmojiApp {
    public readonly emojis: Table<Emoji>;
    public readonly config: Writable<Config>;
    public readonly selectedEmoji: Writable<Emoji | null>;

    constructor(
        private readonly omu: Omu,
        private readonly chat: Chat,
    ) {
        this.emojis = omu.tables.get(EMOJI_TABLE);
        this.config = makeRegistryWritable(omu.registries.get(CONFIG_REGISTRY_TYPE));
        this.selectedEmoji = writable<Emoji | null>(null);
    }

    testEmoji(emoji: Emoji) {
        const room = new models.Room({
            id: EMOJI_TEST_PROVIDER.id.join('test'),
            providerId: EMOJI_TEST_PROVIDER.id,
            connected: false,
            status: 'offline',
            metadata: {},
            createdAt: new Date(),
        });
        this.chat.rooms.update(room);
        this.chat.messages.add(
            new models.Message({
                id: EMOJI_TEST_PROVIDER.id.join('test', 'message', new Date().getTime().toString()),
                roomId: room.id,
                content: new models.content.System([
                    new models.content.Asset(emoji.asset),
                    new models.content.Text(emoji.id),
                ]),
                createdAt: new Date(),
            }),
        );
    }
}

export const emojiApp: Writable<EmojiApp> = writable();

export const EMOJI_TEST_PROVIDER = new Provider({
    id: APP_ID,
    name: 'Emoji Test',
    description: 'Send emoji preview',
    regex: '',
    repository_url: 'https://github.com/OMUAPPS/omuapps',
    url: 'https://example.com',
    version: '0.0.1',
});
