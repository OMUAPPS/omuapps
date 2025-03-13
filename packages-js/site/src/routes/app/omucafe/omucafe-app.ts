import { makeRegistryWritable } from '$lib/helper.js';
import { Chat, events } from '@omujs/chat';
import type { Message } from '@omujs/chat/models/message.js';
import { CHAT_REACTION_PERMISSION_ID } from '@omujs/chat/permissions.js';
import { OBSPlugin, permissions } from '@omujs/obs';
import { App, Omu } from '@omujs/omu';
import { ASSET_DOWNLOAD_PERMISSION_ID, ASSET_UPLOAD_PERMISSION_ID } from '@omujs/omu/extension/asset/asset-extension.js';
import { RegistryType } from '@omujs/omu/extension/registry/index.js';
import { TableType, type Table } from '@omujs/omu/extension/table/table.js';
import { setChat, setClient } from '@omujs/ui';
import { BROWSER } from 'esm-env';
import type { Writable } from 'svelte/store';
import { APP_ID } from './app.js';
import type { Effect } from './game/effect.js';
import type { ItemState } from './game/item-state.js';
import type { Item } from './game/item.js';
import type { Kitchen } from './game/kitchen.js';
import type { Product } from './game/product.js';
import type { Script } from './game/script.js';

export const DEFAULT_CONFIG = {
    version: 1,
    filter: {},
    products: {} as Record<string, Product>,
    items: {} as Record<string, Item>,
    effects: {} as Record<string, Effect>,
    scripts: {} as Record<string, Script>,
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
    type: 'item_edit',
    id: string,
} | {
    type: 'effect_edit',
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

export const DEFAULT_STATES = {
    kitchen: {
        items: {} as Record<string, ItemState>,
        held: null as string | null,
        hovering: null as string | null,
    } as Kitchen,
};

export type States = typeof DEFAULT_STATES;

const STATES_REGISTRY_TYPE = RegistryType.createJson<States>(APP_ID, {
    name: 'states',
    defaultValue: DEFAULT_STATES,
});

function processMessage(message: Message) {
    
}

export function createGame(app: App): Promise<void> {
    const omu = new Omu(app);
    const obs = OBSPlugin.create(omu);
    const chat = Chat.create(omu);
    const config = makeRegistryWritable(omu.registries.get(CONFIG_REGISTRY_TYPE));
    const states = makeRegistryWritable(omu.registries.get(STATES_REGISTRY_TYPE));
    const scene = makeRegistryWritable(omu.registries.get(SCENE_REGISTRY_TYPE));
    const orders = omu.tables.get(ORDER_TABLE_TYPE);
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

    game = {
        omu,
        obs,
        chat,
        config,
        states,
        orders,
        scene,
    }

    return new Promise<void>((resolve) => {
        omu.onReady(() => {
            resolve();
        });
    });
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

let game: Game | null = null;

export function getGame(): Game {
    if (!game) {
        throw new Error('Game not created');
    }
    return game;
}
