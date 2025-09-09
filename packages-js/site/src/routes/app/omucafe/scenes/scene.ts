import { RegistryType } from '@omujs/omu/api/registry';
import { APP_ID } from '../app.js';
import type { Asset } from '../asset/asset.js';

export type PhotoTakeState = {
    type: 'countdown';
    startTime: number;
    duration: number;
} | {
    type: 'taking';
    startTime: number;
    duration: number;
} | {
    type: 'taken';
    asset: Asset;
    time: number;
};

export type Scene = {
    type: 'loading';
} | {
    type: 'install';
} | {
    type: 'main_menu';
} | {
    type: 'photo_mode';
    time: number;
    items: string[];
    photoTake?: PhotoTakeState;
} | {
    type: 'kitchen';
    transition?: {
        time: number;
    };
} | {
    type: 'kitchen_edit';
} | {
    type: 'product_list';
} | {
    type: 'product_edit';
    id: string;
} | {
    type: 'product_take_photo';
    id: string;
} | {
    type: 'item_edit';
    id: string;
    created?: boolean;
} | {
    type: 'effect_edit';
    id: string;
    time: number;
} | {
    type: 'script_edit';
    id: string;
} | {
    type: 'gallery';
};

export type SceneType<T extends Scene['type'] = Scene['type']> = Extract<Scene, { type: T }>;

export const SCENE_REGISTRY_TYPE = RegistryType.createJson<Scene>(APP_ID, {
    name: 'scene',
    defaultValue: {
        type: 'loading',
    },
});

export type SceneContext = {
    time: number;
    active: boolean;
};
