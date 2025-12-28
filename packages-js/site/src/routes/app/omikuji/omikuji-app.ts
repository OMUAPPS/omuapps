import type { Omu } from '@omujs/omu';
import type { Signal } from '@omujs/omu/api/signal';
import type { Table } from '@omujs/omu/api/table';
import type { Writable } from 'svelte/store';

type OmikujiState = {
    type: 'idle';
};

export interface Pattern {
    name: string;
    description: string;
    probability: number;
};

export interface Config {
    patterns: Pattern[];
    active: boolean;
};

export const DEFAULT_CONFIG: Config = {
    active: false,
    patterns: [
        {
            name: '大吉',
            description: '素晴らしい一年になるでしょう。でも油断は禁物です。',
            probability: 1,
        },
        {
            name: '中吉',
            description: '良い運勢です。努力が実を結ぶでしょう。',
            probability: 2,
        },
        {
            name: '小吉',
            description: '慎重に行動すれば、良い結果が得られます。',
            probability: 3,
        },
        {
            name: '吉',
            description: '焦らずに進めば、幸運が訪れます。',
            probability: 4,
        },
        {
            name: '末吉',
            description: '運勢は安定しています。日々の努力を続けましょう。',
            probability: 3,
        },
        {
            name: '凶',
            description: '注意が必要です。無理をせず、冷静に対処しましょう。',
            probability: 2,
        },
        {
            name: '大凶',
            description: '困難な時期ですが、周囲の助けを借りれば乗り越えられます。',
            probability: 1,
        },
    ],
};

export interface Result {
    author: string;
    timestamp: number;
    pattern: Pattern;
    name?: string;
    avatar?: string;
}

export interface LatestMessage {
    author: string;
    timestamp: number;
}

export interface TestData {
    author: string;
}

export class OmikujiApp {
    private static INSTANCE: OmikujiApp;

    private constructor(
        public readonly omikujiState: Writable<OmikujiState>,
        public readonly config: Writable<Config>,
        public readonly results: Table<Result>,
        public readonly testSignal: Signal<TestData>,
    ) { }

    public static create(omu: Omu) {
        if (this.INSTANCE) {
            return this.INSTANCE;
        }
        const app = new OmikujiApp(
            omu.registries.json<OmikujiState>('state', {
                default: { type: 'idle' },
            }).compatSvelte(),
            omu.registries.json<Config>('config', {
                default: DEFAULT_CONFIG,
            }).compatSvelte(),
            omu.tables.json<Result>('results', {
                key: (result) => result.author,
            }),
            omu.signals.json<TestData>('testSignal'),
        );
        OmikujiApp.INSTANCE = app;
        return app;
    }
}
