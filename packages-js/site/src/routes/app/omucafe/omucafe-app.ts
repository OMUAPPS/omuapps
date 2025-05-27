import { makeRegistryWritable } from '$lib/helper.js';
import { Vec2, type Vec2Like } from '$lib/math/vec2.js';
import { type Vec4Like } from '$lib/math/vec4.js';
import { Chat, events } from '@omujs/chat';
import type { Message } from '@omujs/chat/models/message.js';
import { CHAT_REACTION_PERMISSION_ID } from '@omujs/chat/permissions.js';
import { OBSPlugin, permissions } from '@omujs/obs';
import { App, Omu } from '@omujs/omu';
import { ByteReader, ByteWriter } from '@omujs/omu/bytebuffer.js';
import { ASSET_DOWNLOAD_PERMISSION_ID, ASSET_UPLOAD_PERMISSION_ID } from '@omujs/omu/extension/asset/asset-extension.js';
import { RegistryType, type Registry } from '@omujs/omu/extension/registry/index.js';
import { SignalType, type Signal } from '@omujs/omu/extension/signal/signal.js';
import { TableType, type Table } from '@omujs/omu/extension/table/table.js';
import { setChat, setClient } from '@omujs/ui';
import { BROWSER } from 'esm-env';
import { get, writable, type Writable } from 'svelte/store';
import { APP_ID, BACKGROUND_ID, OVERLAY_ID } from './app.js';
import type { Asset } from './game/asset.js';
import type { PlayingAudioClip } from './game/audioclip.js';
import type { Effect } from './game/effect.js';
import { getContext, mouse, paintQueue, setContext } from './game/game.js';
import { copy } from './game/helper.js';
import { cloneItemState, ITEM_LAYERS, removeItemState, type ItemState } from './game/item-state.js';
import type { Item } from './game/item.js';
import type { Kitchen, MouseState } from './game/kitchen.js';
import type { Product } from './game/product.js';
import { assertValue, builder, Globals, ScriptError, type Script, type ScriptContext, type Value } from './game/script.js';
import { Time } from './game/time.js';
import { transformToMatrix } from './game/transform.js';

export const DEFAULT_RESOURCE_REGISTRY = {
    assets: {} as Record<string, Asset>,
}

type ResourceRegistry = typeof DEFAULT_RESOURCE_REGISTRY;

const RESOURCE_REGISTRY_TYPE = RegistryType.createJson<ResourceRegistry>(APP_ID, {
    name: 'resources',
    defaultValue: DEFAULT_RESOURCE_REGISTRY,
});

export const DEFAULT_CONFIG = {
    version: 1,
    obs: {
        scene_uuid: null as string | null,
        background_uuid: null as string | null,
        overlay_uuid: null as string | null,
    },
    scenes: {
        product_list: {
            scroll: 0,
            search: '',
        }
    }
};

export type Config = typeof DEFAULT_CONFIG;

const APP_CONFIG_REGISTRY_TYPE = RegistryType.createJson<Config>(APP_ID, {
    name: 'config',
    defaultValue: DEFAULT_CONFIG,
});

export const DEFAULT_PEN = {
    color: {
        x: 0,
        y: 0,
        z: 0,
        w: 1,
    } as Vec4Like,
    opacity: 1,
    width: 10,
}

export type Pen = typeof DEFAULT_PEN;

export const DEFAULT_ERASER = {
    width: 40,
    opacity: 1,
}

export type Eraser = typeof DEFAULT_ERASER;

export const DEFAULT_TOOL = {
    type: 'move',
} as {
    type: 'move',
} | {
    type: 'pen',
} | {
    type: 'eraser',
}

export type Tool = typeof DEFAULT_TOOL;

export const DEFAULT_GAME_CONFIG = {
    filter: {},
    products: {} as Record<string, Product>,
    items: {} as Record<string, Item>,
    effects: {} as Record<string, Effect>,
    scripts: {} as Record<string, Script>,
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
    created?: boolean,
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
    active: boolean,
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
        mouse: {
            position: Vec2.ZERO as Vec2Like,
            delta: Vec2.ZERO as Vec2Like,
            over: false as boolean,
            ui: false as boolean,
        } satisfies MouseState,
        hovering: null as string | null,
    } satisfies Kitchen,
};

export type States = typeof DEFAULT_STATES;

const STATES_REGISTRY_TYPE = RegistryType.createJson<States>(APP_ID, {
    name: 'states',
    defaultValue: DEFAULT_STATES,
});

export type DrawPath = {
    t: 'qb',
    in: number,
    out: number,
    a: Vec2Like,
    b: Vec2Like,
    c: Vec2Like,
}

export const PAINT_EVENT_TYPE = {
    PEN: 'dr',
    CHANGE_PEN: 'cp',
    ERASER: 'er',
    CHANGE_ERASER: 'ce',
    CLEAR: 'cl',
} as const;

export type PaintEvent = {
    // t: 'p',
    t: typeof PAINT_EVENT_TYPE.PEN,
    path: DrawPath,
} | {
    t: typeof PAINT_EVENT_TYPE.CHANGE_PEN,
    pen: Pen,
} | {
    t: typeof PAINT_EVENT_TYPE.ERASER,
    path: DrawPath,
} | {
    t: typeof PAINT_EVENT_TYPE.CHANGE_ERASER,
    eraser: Eraser,
} | {
    t: typeof PAINT_EVENT_TYPE.CLEAR,
}

const PAINT_SIGNAL_TYPE = SignalType.createJson<PaintEvent[]>(APP_ID, {
    name: 'paint_event',
});

export type PaintEvents = {
    data: string,
};

export class PaintBuffer {
    public static NONE = new PaintBuffer(0, new Uint8Array(0));
    
    constructor(
        public readonly size: number,
        public readonly buffer: Uint8Array,
    ) {}

    public static serialize(data: PaintBuffer): Uint8Array {
        const writer = new ByteWriter();
        writer.writeULEB128(data.size);
        writer.writeUint8Array(data.buffer);
        return writer.finish();
    }

    public static deserialize(data: Uint8Array): PaintBuffer {
        const reader = ByteReader.fromUint8Array(data);
        const size = reader.readULEB128();
        const buffer = reader.readUint8Array();
        reader.finish();
        return new PaintBuffer(size, buffer);
    }

    private writeVector2(writer: ByteWriter, vec: Vec2Like): void {
        writer.writeFloat32(vec.x);
        writer.writeFloat32(vec.y);
    }

    private readVector2(reader: ByteReader): Vec2Like {
        const x = reader.readFloat32();
        const y = reader.readFloat32();
        return new Vec2(x, y);
    }

    private writePath(writer: ByteWriter, path: DrawPath): void {
        writer.writeUint8(0);
        writer.writeFloat32(path.in);
        writer.writeFloat32(path.out);
        this.writeVector2(writer, path.a);
        this.writeVector2(writer, path.b);
        this.writeVector2(writer, path.c);
    }

    private readPath(reader: ByteReader): DrawPath {
        const type = reader.readUint8();
        if (type !== 0) {
            throw new Error(`Unexpected path type: ${type}`);
        }
        const inValue = reader.readFloat32();
        const outValue = reader.readFloat32();
        const a = this.readVector2(reader);
        const b = this.readVector2(reader);
        const c = this.readVector2(reader);
        return {
            t: 'qb',
            in: inValue,
            out: outValue,
            a,
            b,
            c,
        };
    }

    public push(...events: PaintEvent[]): PaintBuffer {
        const writer = ByteWriter.fromUint8Array(this.buffer);
        const TYPES = {
            [PAINT_EVENT_TYPE.PEN]: 0,
            [PAINT_EVENT_TYPE.CHANGE_PEN]: 1,
            [PAINT_EVENT_TYPE.ERASER]: 2,
            [PAINT_EVENT_TYPE.CHANGE_ERASER]: 3,
            [PAINT_EVENT_TYPE.CLEAR]: 4,
        };
        
        for (const event of events) {
            const { t } = event;
            const type = TYPES[t];
            writer.writeUint8(type);
            switch (t) {
                case PAINT_EVENT_TYPE.PEN:
                case PAINT_EVENT_TYPE.ERASER: {
                    const { path } = event;
                    this.writePath(writer, path);
                    break;
                }
                case PAINT_EVENT_TYPE.CHANGE_PEN:
                    writer.writeString(JSON.stringify(event));
                    break;
                case PAINT_EVENT_TYPE.CHANGE_ERASER:
                    writer.writeString(JSON.stringify(event));
                    break;
                case PAINT_EVENT_TYPE.CLEAR:
                    break;
            }
        }
        // this.size += events.length;
        // this.buffer = writer.finish();
        return new PaintBuffer(this.size + events.length, writer.finish());
    }

    public read(): PaintEvent[] {
        const reader = ByteReader.fromUint8Array(this.buffer);
        const events: PaintEvent[] = [];
        for (let i = 0; i < this.size; i++) {
            const type = reader.readUint8();
            switch (type) {
                case 0: {
                    const path = this.readPath(reader);
                    events.push({
                        t: PAINT_EVENT_TYPE.PEN,
                        path,
                    });
                    break;
                }
                case 1: {
                    events.push(JSON.parse(reader.readString()));
                    break;
                }
                case 2: {
                    const path = this.readPath(reader);
                    events.push({
                        t: PAINT_EVENT_TYPE.ERASER,
                        path,
                    });
                    break;
                }
                case 3: {
                    events.push(JSON.parse(reader.readString()));
                    break;
                }
                case 4:
                    events.push({
                        t: PAINT_EVENT_TYPE.CLEAR,
                    });
                    break;
            }
        }
        return events;
    }
}

const PAINT_EVENTS_REGISTRY_TYPE = RegistryType.createSerialized<PaintBuffer>(APP_ID, {
    name: 'paint_events',
    defaultValue: PaintBuffer.NONE,
    serializer: PaintBuffer,
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
        paintQueue.push({
            t: PAINT_EVENT_TYPE.CLEAR,
        });
        assertValue(ctx, itemId, 'string');
        const { items } = getContext();
        const counter = items[itemId.value];
        for (const item of Object.values(items)) {
            if (item.parent) continue;
            if (item.layer !== ITEM_LAYERS.PHOTO_MODE) continue;
            removeItemState(item);
        }
        for (const id of counter.children) {
            const item = items[id];
            const transform = transformToMatrix(item.transform);
            const { min, max } = item.bounds;
            const offset = new Vec2(
                (min.x + max.x) / 2,
                (min.y + max.y) / 2,
            ).mul({
                x: transform.m00,
                y: transform.m11,
            });
            cloneItemState(item, {
                layer: ITEM_LAYERS.PHOTO_MODE,
                transform: {
                    right: item.transform.right,
                    up: item.transform.up,
                    offset: {
                        x: -offset.x,
                        y: -offset.y,
                    },
                }
            })
        }
        game?.scene.set({
            type: 'photo_mode',
            time: Time.get(),
            items: [...counter.children],
        });
        const { v } = builder;
        return v.void();
    },
}

export const lastSceneChange = writable<number>(0);

export async function createGame(app: App, side: 'client' | 'background' | 'overlay'): Promise<void> {
    const client = app.id.isEqual(APP_ID);
    const omu = new Omu(app);
    const obs = OBSPlugin.create(omu);
    const chat = Chat.create(omu);
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
    const paintSignal = omu.signals.get(PAINT_SIGNAL_TYPE);
    const paintEvents = makeRegistryWritable(omu.registries.get(PAINT_EVENTS_REGISTRY_TYPE));
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
        paintSignal,
        paintEvents,
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
            mouse: {
                position: Vec2.ZERO as Vec2Like,
                delta: Vec2.ZERO as Vec2Like,
                over: mouse.over,
                ui: mouse.ui,
            },
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
    gameConfigRegistry: Registry<GameConfig>,
    gameConfig: Writable<GameConfig>,
    configRegistry: Registry<Config>,
    config: Writable<Config>,
    resourcesRegistry: Registry<ResourceRegistry>,
    resources: Writable<ResourceRegistry>,
    statesRegistry: Registry<States>,
    states: Writable<States>,
    sceneRegistry: Registry<Scene>,
    scene: Writable<Scene>,
    orders: Table<Order>,
    paintSignal: Signal<PaintEvent[]>,
    paintEvents: Writable<PaintBuffer>,
    globals: Globals,
};

let game: Game | null = null;

export function getGame(): Game {
    if (!game) {
        throw new Error('Game not created');
    }
    return game;
}
