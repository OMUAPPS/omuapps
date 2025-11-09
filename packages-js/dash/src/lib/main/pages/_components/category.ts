import type { LocalizedText } from '@omujs/omu/localization';

export type Tag = {
    name: LocalizedText;
    description: LocalizedText;
    icon: string;
};

export const TAG_REGISTRY = {
    youtube: {
        name: {
            en: 'Youtube',
            ja: 'Youtube',
        },
        description: {
            ja: 'Youtubeの機能を使ったアプリ',
            en: 'The app uses Youtube features',
        },
        icon: 'ti ti-brand-youtube',
    },
    asset: {
        name: {
            en: 'Assets',
            ja: 'アセット',
        },
        description: {
            ja: '配信ソフトに追加することができるアプリ',
            en: 'The app can be added to streaming software',
        },
        icon: 'ti ti-library-photo',
    },
    game: {
        name: {
            en: 'Game',
            ja: 'ゲーム',
        },
        description: {
            ja: 'ひとりじゃないゲームで遊べるアプリ',
            en: 'Play games with others',
        },
        icon: 'ti ti-device-gamepad',
    },
    tool: {
        name: {
            en: 'Tool',
            ja: 'ツール',
        },
        description: {
            ja: 'ちょっとした作業を効率化するツール',
            en: 'Tools to streamline your work',
        },
        icon: 'ti ti-tools',
    },
    underdevelopment: {
        name: {
            en: 'Under development',
            ja: '開発中',
        },
        description: {
            ja: 'まだ最低限の動作の安定性が確保されていないアプリ',
            en: 'The app has not yet achieved the minimum stability of operation.',
        },
        icon: 'ti ti-flask-filled',
    },
} as const satisfies Record<string, Tag>;
export const TAGS = { ...TAG_REGISTRY } as Record<string, Tag>;

export type TagKey = keyof typeof TAG_REGISTRY;
