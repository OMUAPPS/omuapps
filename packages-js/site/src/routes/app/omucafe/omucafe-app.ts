import { makeRegistryWritable, once } from '$lib/helper.js';
import { Vec2, type Vec2Like } from '$lib/math/vec2.js';
import { Chat, ChatEvents, ChatPermissions } from '@omujs/chat';
import { OBSPermissions, OBSPlugin } from '@omujs/obs';
import { App, Omu, OmuPermissions, Serializer } from '@omujs/omu';
import { RegistryType, type Registry } from '@omujs/omu/api/registry';
import { type Signal } from '@omujs/omu/api/signal';
import { type Table } from '@omujs/omu/api/table';
import { setChat, setClient } from '@omujs/ui';
import { BROWSER } from 'esm-env';
import { get, writable, type Writable } from 'svelte/store';
import { APP_ID, BACKGROUND_ID, OVERLAY_ID } from './app.js';
import type { Asset } from './asset/asset.js';
import type { PlayingAudioClip } from './asset/audioclip.js';
import type { EffectState } from './effect/effect-state.js';
import { GALLERY_TABLE_TYPE, type GalleryItem } from './gallery/gallery.js';
import { APP_CONFIG_REGISTRY_TYPE, type Config } from './game/config.js';
import { getContext, mouse, setContext } from './game/game.js';
import { DEFAULT_ERASER, DEFAULT_PEN, DEFAULT_TOOL, PAINT_EVENTS_REGISTRY_TYPE, PAINT_SIGNAL_TYPE, PaintBuffer, type PaintEvent } from './game/paint.js';
import { type ItemState } from './item/item-state.js';
import type { Item } from './item/item.js';
import type { Kitchen, MouseState } from './kitchen/kitchen.js';
import { ORDER_TABLE_TYPE, processMessage, type Order } from './order/order.js';
import type { Product } from './product/product.js';
import { SCENE_REGISTRY_TYPE, type Scene } from './scenes/scene.js';
import { scriptAPI } from './script/api.js';
import { Globals, type Script } from './script/script.js';
import { getWorker, type GameCommands } from './worker/game-worker.js';
import type { WorkerPipe } from './worker/worker.js';

export const DEFAULT_RESOURCE_REGISTRY = {
    assets: {} as Record<string, Asset>,
};

export type ResourceRegistry = typeof DEFAULT_RESOURCE_REGISTRY;

const RESOURCE_REGISTRY_TYPE = RegistryType.createJson<ResourceRegistry>(APP_ID, {
    name: 'resources',
    defaultValue: DEFAULT_RESOURCE_REGISTRY,
});

type MenuItem = {
    product: string;
    picture: boolean;
    note: string;
};

export const DEFAULT_GAME_CONFIG = {
    version: 1,
    filter: {},
    products: {} as Record<string, Product>,
    items: {} as Record<string, Item>,
    effects: {} as Record<string, EffectState>,
    scripts: {} as Record<string, Script>,
    menu: {
        items: [] as MenuItem[],
        enabled: false,
    },
    photo_mode: {
        scale: 0,
        offset: Vec2.ZERO as Vec2Like,
        tool: DEFAULT_TOOL,
        pen: DEFAULT_PEN,
        eraser: DEFAULT_ERASER,
    },
};

export type GameConfig = typeof DEFAULT_GAME_CONFIG;

const CONFIG_REGISTRY_TYPE = RegistryType.createJson<GameConfig>(APP_ID, {
    name: 'game_config',
    defaultValue: DEFAULT_GAME_CONFIG,
    serializer: Serializer.transform<GameConfig>((config) => {
        if (!config.version) {
            config.menu = {
                items: [],
                enabled: false,
            };
            config.version = 1;
        }
        return config;
    }).fallback(DEFAULT_GAME_CONFIG),
});

export type User = {
    id: string;
    screen_id?: string;
    name: string;
    avatar?: string;
};

export const DEFAULT_STATES = {
    kitchen: {
        audios: {} as Record<string, PlayingAudioClip>,
        items: {} as Record<string, ItemState>,
        held: null as string | null,
        mouse: {
            position: Vec2.ZERO as Vec2Like,
            delta: Vec2.ZERO as Vec2Like,
            over: false as boolean,
            ui: false as boolean,
        } satisfies MouseState,
        hovering: null as string | null,
        order: null as Order | null,
        lastOrder: null as Order | null,
    } satisfies Kitchen,
};

export type States = typeof DEFAULT_STATES;

const STATES_REGISTRY_TYPE = RegistryType.createJson<States>(APP_ID, {
    name: 'states',
    defaultValue: DEFAULT_STATES,
});

export const sessions = writable({
    overlay: false,
    background: false,
});

async function startCheckInstalled(): Promise<void> {
    if (!game) throw new Error('Game not created');
    const { omu } = game;
    omu.sessions.observe(OVERLAY_ID, {
        onConnect: () => sessions.update((s) => ({ ...s, overlay: true })),
        onDisconnect: () => sessions.update((s) => ({ ...s, overlay: false })),
    });
    omu.sessions.observe(BACKGROUND_ID, {
        onConnect: () => sessions.update((s) => ({ ...s, background: true })),
        onDisconnect: () => sessions.update((s) => ({ ...s, background: false })),
    });
    sessions.set({
        overlay: await omu.sessions.has(OVERLAY_ID),
        background: await omu.sessions.has(BACKGROUND_ID),
    });
}

export function isInstalled(): boolean {
    const state = get(sessions);
    return state.overlay && state.background;
}

export const lastSceneChange = writable<number>(0);

export type GameSide = 'client' | 'background' | 'overlay';

export async function createGame(app: App, side: GameSide): Promise<void> {
    const client = app.id.isEqual(APP_ID);
    const omu = setClient(new Omu(app));
    const chat = setChat(Chat.create(omu));
    const obs = OBSPlugin.create(omu);
    const gameConfigRegistry = omu.registries.get(CONFIG_REGISTRY_TYPE);
    const gameConfig = makeRegistryWritable(gameConfigRegistry);
    const configRegistry = omu.registries.get(APP_CONFIG_REGISTRY_TYPE);
    const config = makeRegistryWritable(configRegistry);
    const resourcesRegistry = omu.registries.get(RESOURCE_REGISTRY_TYPE);
    const resources = makeRegistryWritable(resourcesRegistry);
    const statesRegistry = omu.registries.get(STATES_REGISTRY_TYPE);
    const states = makeRegistryWritable(statesRegistry);
    const sceneRegistry = omu.registries.get(SCENE_REGISTRY_TYPE);
    const scene = makeRegistryWritable(sceneRegistry);
    const orders = omu.tables.get(ORDER_TABLE_TYPE);
    const gallery = omu.tables.get(GALLERY_TABLE_TYPE);
    const paintSignal = omu.signals.get(PAINT_SIGNAL_TYPE);
    const paintEvents = makeRegistryWritable(omu.registries.get(PAINT_EVENTS_REGISTRY_TYPE));

    chat.on(ChatEvents.Message.Add, (message) => {
        processMessage(message);
    });

    game = {
        side,
        omu,
        obs,
        chat,
        gameConfigRegistry,
        configRegistry,
        resourcesRegistry,
        resources,
        statesRegistry,
        sceneRegistry,
        gameConfig,
        config,
        states,
        orders,
        gallery,
        paintSignal,
        paintEvents,
        scene,
        globals: scriptAPI,
        worker: client ? await getWorker() : undefined,
    };
    if (BROWSER) {
        omu.permissions.require(
            OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
            OmuPermissions.REGISTRY_PERMISSION_ID,
            OmuPermissions.ASSET_DOWNLOAD_PERMISSION_ID,
        );
        if (client) {
            omu.permissions.require(
                OmuPermissions.DAShBOARD_DRAG_DROP_PERMISSION_ID,
                OmuPermissions.ASSET_UPLOAD_PERMISSION_ID,
                OBSPermissions.OBS_SOURCE_CREATE_PERMISSION_ID,
                OBSPermissions.OBS_SOURCE_UPDATE_PERMISSION_ID,
                OBSPermissions.OBS_SOURCE_READ_PERMISSION_ID,
                OBSPermissions.OBS_SCENE_READ_PERMISSION_ID,
                OBSPermissions.OBS_SCENE_CREATE_PERMISSION_ID,
                ChatPermissions.CHAT_REACTION_PERMISSION_ID,
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
            mouse: {
                position: Vec2.ZERO as Vec2Like,
                delta: Vec2.ZERO as Vec2Like,
                over: mouse.over,
                ui: mouse.ui,
            },
            config: await gameConfigRegistry.get(),
            scene: await sceneRegistry.get(),
            states: await statesRegistry.get(),
        });
        gameConfig.subscribe((value) => {
            setContext({
                ...getContext(),
                config: value,
            });
        });
        states.subscribe((value) => {
            setContext({
                ...getContext(),
                ...value.kitchen,
                states: value,
            });
        });
        scene.subscribe((value) => {
            setContext({
                ...getContext(),
                scene: value,
            });
        });

        await startCheckInstalled();
        if (!isInstalled()) {
            once((resolve) => {
                return sessions.subscribe((value) => {
                    if (value.background && value.overlay) {
                        scene.set({
                            type: 'main_menu',
                        });
                        resolve();
                    }
                });
            });
            scene.set({
                type: 'install',
            });
        }
    }
}

export type Game = {
    side: GameSide;
    omu: Omu;
    obs: OBSPlugin;
    chat: Chat;
    gameConfigRegistry: Registry<GameConfig>;
    gameConfig: Writable<GameConfig>;
    configRegistry: Registry<Config>;
    config: Writable<Config>;
    resourcesRegistry: Registry<ResourceRegistry>;
    resources: Writable<ResourceRegistry>;
    statesRegistry: Registry<States>;
    states: Writable<States>;
    sceneRegistry: Registry<Scene>;
    scene: Writable<Scene>;
    orders: Table<Order>;
    gallery: Table<GalleryItem>;
    paintSignal: Signal<PaintEvent[]>;
    paintEvents: Writable<PaintBuffer>;
    globals: Globals;
    worker?: WorkerPipe<GameCommands>;
};

let game: Game | null = null;

export function getGame(): Game {
    if (!game) {
        throw new Error('Game not created');
    }
    return game;
}
