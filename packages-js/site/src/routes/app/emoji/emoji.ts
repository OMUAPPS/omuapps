import { makeRegistryWritable } from '$lib/helper.js';
import { Chat, models } from '@omujs/chat';
import { Provider } from '@omujs/chat/models';
import { Identifier, Serializer, type Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/api/registry';
import { TableType, type Table } from '@omujs/omu/api/table';
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

export type Emoji = {
    readonly id: string;
    asset: Identifier;
    patterns: Pattern[];
}

export const EMOJI_TABLE = TableType.createJson<Emoji>(PLUGIN_IDENTIFIER, {
    name: 'emoji',
    key: (item) => item.id,
    serializer: Serializer.noop<Emoji>()
        .field('asset', Identifier)
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
                content: { type: 'system', data: [
                    { type: 'asset', data: { id: emoji.asset.key() } },
                    { type: 'text', data: emoji.id },
                ]},
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
