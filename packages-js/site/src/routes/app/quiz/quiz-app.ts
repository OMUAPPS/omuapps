import { sha256 } from '$lib/helper';
import { Identifier, type Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/api/registry';
import { TableType, type Table } from '@omujs/omu/api/table';
import type { Writable } from 'svelte/store';
import { APP_ID } from './app';

export type Asset = {
    type: 'url';
    url: string;
} | {
    type: 'asset';
    id: string;
};

export type PlayState = { quiz: Quiz } & ({
    type: 'idle';
} | {
    type: 'play';
    state: QuestionState;
    index: number;
});

export type Scene = {
    type: 'main_menu';
} | {
    type: 'quiz_list';
} | {
    type: 'quiz_create';
    quiz: Quiz;
} | {
    type: 'quiz_play';
    state: PlayState;
};

export type Prompt = {
    type: 'text';
    body: string;
} | {
    type: 'asset';
    assets: Asset[];
};

export type Choice = {
    text: string;
    answer: boolean;
};

export type Answer = {
    type: 'choices';
    choices: Choice[];
    randomize: boolean;
} | {
    type: 'text';
    answers: string[];
};

export type Hint = {
    type: 'text';
    body: string;
};

export type Question = {
    prompt: Prompt;
    answer: Answer;
    hint: Hint;
};

export type QuestionState = {
    type: 'idle';
} | {
    type: 'qustioning';
} | {
    type: 'answering';
};

export type QuizInfo = {
    title: string;
    description: string;
};

export type Quiz = {
    id: string;
    questions: Question[];
    info: QuizInfo;
};

const EMPTY_QUIZ: Quiz = {
    id: '',
    info: {
        title: 'クイズ',
        description: '',
    },
    questions: [],
};

export function createQuiz() {
    const newQuiz = JSON.parse(JSON.stringify(EMPTY_QUIZ));
    newQuiz.id = `${Date.now()}`;
    return newQuiz;
}

const SCENE_CURRENT_REGISTRY = RegistryType.createJson<Scene>(APP_ID, {
    name: 'scene_current',
    defaultValue: { type: 'main_menu' },
});
const SCENE_HISTORY_REGISTRY = RegistryType.createJson<Scene[]>(APP_ID, {
    name: 'scene_history',
    defaultValue: [],
});
const ASSETS_REGISTRY = RegistryType.createJson<Record<string, Asset>>(APP_ID, {
    name: 'assets',
    defaultValue: {},
});
const QUIZZES_TABLE = TableType.createJson<Quiz>(APP_ID, {
    name: 'quizzes',
    key: (quiz) => quiz.id,
});

export class QuizApp {
    private static INSTANCE: QuizApp;
    public readonly sceneCurrent: Writable<Scene>;
    public readonly sceneHistory: Writable<Scene[]>;
    public readonly quizzes: Table<Quiz>;
    public readonly assets: Writable<Record<string, Asset>>;
    private readonly assetCache: Record<string, Promise<string>> = {};

    private constructor(
        public readonly omu: Omu,
    ) {
        this.sceneCurrent = omu.registries.get(SCENE_CURRENT_REGISTRY).compatSvelte();
        this.sceneHistory = omu.registries.get(SCENE_HISTORY_REGISTRY).compatSvelte();
        this.assets = omu.registries.get(ASSETS_REGISTRY).compatSvelte();
        this.quizzes = omu.tables.get(QUIZZES_TABLE);
    }

    public static create(omu: Omu) {
        QuizApp.INSTANCE = new QuizApp(omu);
        return this.INSTANCE;
    }

    public static getInstance() {
        return QuizApp.INSTANCE;
    }

    public pushScene(scene: Scene) {
        this.sceneHistory.update((history) => {
            this.sceneCurrent.update((current) => {
                history.push(current);
                return scene;
            });
            return history;
        });
    }
    public popScene() {
        this.sceneHistory.update((history) => {
            this.sceneCurrent.update(() => {
                return history.pop() ?? { type: 'main_menu' };
            });
            return history;
        });
    }

    public async uploadAsset(file: File): Promise<Asset> {
        const buffer = new Uint8Array(await file.arrayBuffer());
        const hash = sha256(buffer);
        const hashHex = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
        const assetId = this.omu.app.id.join(hashHex);
        const id = await this.omu.assets.upload(assetId, buffer);
        const asset: Asset = {
            type: 'asset',
            id: id.key(),
        };
        this.assets.update((assets) => {
            assets[asset.id] = asset;
            return assets;
        });
        return asset;
    };

    public async downloadAsset(asset: Asset): Promise<string> {
        switch (asset.type) {
            case 'url': {
                return asset.url;
            }
            case 'asset': {
                const existing = this.assetCache[asset.id];
                if (existing) return existing;
                const download = async (): Promise<Blob> => {
                    const id = Identifier.fromKey(asset.id);
                    const { buffer } = await this.omu.assets.download(id);
                    const blob = new Blob([buffer as Uint8Array<ArrayBuffer>]);
                    return blob;
                };
                const url = this.assetCache[asset.id] = download().then((blob) => URL.createObjectURL(blob));
                return url;
            }
        }
    }
}
