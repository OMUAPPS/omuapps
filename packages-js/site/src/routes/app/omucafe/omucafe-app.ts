import { makeRegistryWritable } from '$lib/helper.js';
import { Chat, events } from '@omujs/chat';
import type { Message } from '@omujs/chat/models/message.js';
import { CHAT_REACTION_PERMISSION_ID } from '@omujs/chat/permissions.js';
import { OBSPlugin, permissions } from '@omujs/obs';
import { Omu } from '@omujs/omu';
import { ASSET_DOWNLOAD_PERMISSION_ID, ASSET_UPLOAD_PERMISSION_ID } from '@omujs/omu/extension/asset/asset-extension.js';
import { RegistryType } from '@omujs/omu/extension/registry/index.js';
import { TableType, type Table } from '@omujs/omu/extension/table/table.js';
import { setChat, setClient } from '@omujs/ui';
import { BROWSER } from 'esm-env';
import type { Writable } from 'svelte/store';
import { APP, APP_ID } from './app.js';

export type Asset = {
    type: 'url',
    url: string,
} | {
    type: 'asset',
    id: string,
};

export type Ingredient = {
    id: string,
    name: string,
    image?: Asset,
};

export type Recipe = {
    ingredients: Record<string, {
        amount: number,
    }>,
    steps: {
        image: Asset,
        text: string,
    }[],
};

export type Product = {
    id: string,
    name: string,
    description?: string,
    image?: Asset,
    recipe: Recipe,
};

export const DEFAULT_CONFIG = {
    version: 1,
    filter: {
    },
    products: {} as Record<string, Product>,
    ingredients: {} as Record<string, Ingredient>,
};

export type Config = typeof DEFAULT_CONFIG;

const CONFIG_REGISTRY_TYPE = RegistryType.createJson<Config>(APP_ID, {
    name: 'config',
    defaultValue: DEFAULT_CONFIG,
});

export type Scene = {
    type: 'loading',
} | {
    type: 'main_menu',
} | {
    type: 'photo_mode',
} | {
    type: 'cooking',
} | {
    type: 'product_list',
} | {
    type: 'product_edit',
    id: string,
} | {
    type: 'ingredient_edit',
    id: string,
};

const SCENE_REGISTRY_TYPE = RegistryType.createJson<Scene>(APP_ID, {
    name: 'scene',
    defaultValue: {
        type: 'loading',
    },
});

export type SceneContext = {
    time: number,
}

type User = {
    id: string,
    name: string,
    avatar?: string,
};
type OrderStatus = {
    type: 'waiting',
} | {
    type: 'cooking',
} | {
    type: 'done',
};

export type Order = {
    id: number,
    user: User,
    status: OrderStatus,
}

const ORDER_TABLE_TYPE = TableType.createJson<Order>(APP_ID, {
    name: 'orders',
    key: (order) => order.id.toString(),
});

export type Transform = {
    x: number,
    y: number,
    scale: {
        x: number,
        y: number,
    }
    rotation: number,
};

export type Behaviors = Partial<{
    plate?: {
        placed: boolean,
        image: Asset,
    },
    cuttable?: {
        cut: boolean,
        image: Asset,
    },
    fryable?: {
        fried: boolean,
        image: Asset,
    },
    mixable?: {
        mixed: boolean,
        image: Asset,
    },
    boilable?: {
        boiled: boolean,
        image: Asset,
    },
    stackable?: {
        items: KitchenItem[],
    },
}>

export type KitchenItem = {
    type: 'ingredient',
    id: string,
    ingredient: Ingredient,
    behaviors: Behaviors,
    transform: Transform,
};

export const DEFAULT_STATES = {
    kitchen: {
        items: {} as Record<string, KitchenItem>,
        held: null as string | null,
        hovering: null as string | null,
    },
};

export type States = typeof DEFAULT_STATES;

const STATES_REGISTRY_TYPE = RegistryType.createJson<States>(APP_ID, {
    name: 'states',
    defaultValue: DEFAULT_STATES,
});

function processMessage(message: Message) {
    
}

function createGame(): Game {
    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    const chat = Chat.create(omu);
    const config = makeRegistryWritable(omu.registries.get(CONFIG_REGISTRY_TYPE));
    const states = makeRegistryWritable(omu.registries.get(STATES_REGISTRY_TYPE));
    const scene = makeRegistryWritable(omu.registries.get(SCENE_REGISTRY_TYPE));
    const orders = omu.tables.create(ORDER_TABLE_TYPE);
    setClient(omu);
    setChat(chat);

    chat.on(events.message.add, (message) => {
        processMessage(message);
    });

    if (BROWSER) {
        omu.permissions.require(
            permissions.OBS_SOURCE_CREATE_PERMISSION_ID,
            ASSET_UPLOAD_PERMISSION_ID,
            ASSET_DOWNLOAD_PERMISSION_ID,
            CHAT_REACTION_PERMISSION_ID,
        );
        omu.start();
    }

    return {
        omu,
        obs,
        chat,
        config,
        states,
        orders,
        scene,
    }
}

export type Game = {
    omu: Omu,
    obs: OBSPlugin,
    chat: Chat,
    config: Writable<Config>,
    states: Writable<States>,
    orders: Table<Order>,
    scene: Writable<Scene>,
};

export const game: Game = createGame();

export async function uploadAsset(file: File): Promise<Asset> {
    const buffer = new Uint8Array(await file.arrayBuffer());
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const id = APP_ID.join('asset', hash);
    const result = await game.omu.assets.upload(id, buffer);
    return {
        type: 'asset',
        id: result.key(),
    }
}
