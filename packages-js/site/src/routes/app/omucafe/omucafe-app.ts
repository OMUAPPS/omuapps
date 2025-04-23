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
import { get, writable, type Writable } from 'svelte/store';
import { APP_ID, BACKGROUND_ID, OVERLAY_ID } from './app.js';
import type { PlayingAudioClip } from './game/audioclip.js';
import type { Effect } from './game/effect.js';
import { getContext, setContext } from './game/game.js';
import { copy } from './game/helper.js';
import type { ItemState } from './game/item-state.js';
import type { Item } from './game/item.js';
import type { Kitchen } from './game/kitchen.js';
import type { Product } from './game/product.js';
import { assertValue, builder, Globals, ScriptError, type Script, type ScriptContext, type Value } from './game/script.js';
import { Time } from './game/time.js';

export const DEFAULT_CONFIG = {
    version: 1,
    obs: {
        scene_uuid: null as string | null,
        background_uuid: null as string | null,
        overlay_uuid: null as string | null,
    },
};

export type Config = typeof DEFAULT_CONFIG;

const APP_CONFIG_REGISTRY_TYPE = RegistryType.createJson<Config>(APP_ID, {
    name: 'config',
    defaultValue: DEFAULT_CONFIG,
});

export const DEFAULT_GAME_CONFIG = {
    filter: {},
    products: {} as Record<string, Product>,
    items: {} as Record<string, Item>,
    effects: {} as Record<string, Effect>,
    scripts: {} as Record<string, Script>,
};

export type GameConfig = typeof DEFAULT_GAME_CONFIG;

const CONFIG_REGISTRY_TYPE = RegistryType.createJson<GameConfig>(APP_ID, {
    name: 'game_config',
    defaultValue: DEFAULT_GAME_CONFIG,
});

export type Scene = {
    type: 'loading',
} | {
    type: 'install',
} | {
    type: 'main_menu',
} | {
    type: 'photo_mode',
    time: number,
    items: string[],
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
    current: boolean,
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
        audios: {} as Record<string, PlayingAudioClip>,
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
    console.log('[msg]', message.text);
}

export const sessions = writable({
    overlay: false,
    background: false,
});

async function startCheckInstalled(): Promise<void> {
    if (!game) throw new Error('Game not created');
    const { omu } = game;
    omu.server.observeSession(OVERLAY_ID, {
        onConnect: () => sessions.update((s) => ({ ...s, overlay: true })),
        onDisconnect: () => sessions.update((s) => ({ ...s, overlay: false })),
    });
    omu.server.observeSession(BACKGROUND_ID, {
        onConnect: () => sessions.update((s) => ({ ...s, background: true })),
        onDisconnect: () => sessions.update((s) => ({ ...s, background: false })),
    });
    sessions.set({
        overlay: await omu.server.sessions.has(OVERLAY_ID.key()),
        background: await omu.server.sessions.has(BACKGROUND_ID.key()),
    });
}

export function isInstalled(): boolean {
    const state = get(sessions);
    return state.overlay && state.background;
}

const functions = {
    log(ctx: ScriptContext, args: Value[]): Value {
        if (args.length !== 1) throw new ScriptError(`Expected 1 arguments but got ${args.length}`, { callstack: ctx.callstack, index: ctx.index });
        const [message] = args;
        assertValue(ctx, message, 'string');
        console.log('[log]', message.value);
        const { v } = builder;
        return v.void();
    },
    create_effect(ctx: ScriptContext, args: Value[]): Value {
        if (args.length !== 2) throw new ScriptError(`Expected 2 arguments but got ${args.length}`, { callstack: ctx.callstack, index: ctx.index });
        const [itemId, effectId] = args;
        assertValue(ctx, itemId, 'string');
        assertValue(ctx, effectId, 'string');
        const { v } = builder;
        const config = getContext().config;
        const item = getContext().items[itemId.value];
        const effect = config.effects[effectId.value];
        item.effects[effect.id] = copy(effect);
        return v.void();
    },
    remove_effect(ctx: ScriptContext, args: Value[]): Value {
        if (args.length !== 2) throw new ScriptError(`Expected 2 arguments but got ${args.length}`, { callstack: ctx.callstack, index: ctx.index });
        const [itemId, effectId] = args;
        assertValue(ctx, itemId, 'string');
        assertValue(ctx, effectId, 'string');
        const item = getContext().items[itemId.value];
        delete item.effects[effectId.value];
        const { v } = builder;
        return v.void();
    },
    complete(ctx: ScriptContext, args: Value[]): Value {
        const [itemId] = args;
        assertValue(ctx, itemId, 'string');
        const counter = getContext().items[itemId.value];
        game?.scene.set({
            type: 'photo_mode',
            time: Time.get(),
            items: [...counter.children],
        });
        const { v } = builder;
        return v.void();
    },
}
export async function createGame(app: App, side: 'client' | 'background' | 'overlay'): Promise<void> {
    const client = app.id.isEqual(APP_ID);
    const omu = new Omu(app);
    const obs = OBSPlugin.create(omu);
    const chat = Chat.create(omu);
    const gameConfigRegistry = omu.registries.get(CONFIG_REGISTRY_TYPE);
    const gameConfig = makeRegistryWritable(gameConfigRegistry);
    const configRegistry = omu.registries.get(APP_CONFIG_REGISTRY_TYPE);
    const config = makeRegistryWritable(configRegistry);
    const statesRegistry = omu.registries.get(STATES_REGISTRY_TYPE);
    const states = makeRegistryWritable(statesRegistry);
    const sceneRegistry = omu.registries.get(SCENE_REGISTRY_TYPE);
    const scene = makeRegistryWritable(sceneRegistry);
    const orders = omu.tables.get(ORDER_TABLE_TYPE);
    const globals = new Globals();
    globals.registerFunction('log', [
        {name: 'message', type: 'string'},
    ], functions.log);
    globals.registerFunction('create_effect', [
        {name: 'itemId', type: 'string'},
        {name: 'effectId', type: 'string'},
    ], functions.create_effect);
    globals.registerFunction('remove_effect', [
        {name: 'itemId', type: 'string'},
        {name: 'effectId', type: 'string'},
    ], functions.remove_effect);
    globals.registerFunction('complete', [
        {name: 'itemId', type: 'string'},
    ], functions.complete);
    setClient(omu);
    setChat(chat);

    chat.on(events.message.add, (message) => {
        processMessage(message);
    });

    game = {
        omu,
        obs,
        chat,
        gameConfig,
        config,
        states,
        orders,
        scene,
        globals,
    }
    if (BROWSER) {
        omu.permissions.require(
            ASSET_DOWNLOAD_PERMISSION_ID,
        );
        if (client) {
            omu.permissions.require(
                permissions.OBS_SOURCE_CREATE_PERMISSION_ID,
                permissions.OBS_SOURCE_UPDATE_PERMISSION_ID,
                permissions.OBS_SOURCE_READ_PERMISSION_ID,
                permissions.OBS_SCENE_READ_PERMISSION_ID,
                permissions.OBS_SCENE_CREATE_PERMISSION_ID,
                ASSET_UPLOAD_PERMISSION_ID,
                CHAT_REACTION_PERMISSION_ID,
            );
        }
        omu.start();

        await omu.waitForReady();
        await gameConfig.wait();
        await scene.wait();
        await states.wait();
        setContext({
            ...(await statesRegistry.get()).kitchen,
            side,
            config: await gameConfigRegistry.get(),
            scene: await sceneRegistry.get(),
            states: await statesRegistry.get(),
        })
        gameConfig.subscribe((value) => {
            setContext({
                ...getContext(),
                config: value,
            })
        });
        states.subscribe((value) => {
            setContext({
                ...getContext(),
                ...value.kitchen,
                states: value,
            })
        });
        scene.subscribe((value) => {
            setContext({
                ...getContext(),
                scene: value,
            })
        });

        await startCheckInstalled();
        if (!isInstalled()) {
            scene.set({
                type: 'install',
            });
        }
    }
}

export type Game = {
    omu: Omu,
    obs: OBSPlugin,
    chat: Chat,
    gameConfig: Writable<GameConfig>,
    config: Writable<Config>,
    states: Writable<States>,
    orders: Table<Order>,
    scene: Writable<Scene>,
    globals: Globals,
};

let game: Game | null = null;

export function getGame(): Game {
    if (!game) {
        throw new Error('Game not created');
    }
    return game;
}
