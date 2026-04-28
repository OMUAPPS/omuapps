
import { AABB2 } from '$lib/math/aabb2';
import { invLerp, lerp } from '$lib/math/math';
import { Vec2, type Vec2Like } from '$lib/math/vec2';
import type { Vec4Like } from '$lib/math/vec4';
import type { Models } from '@omujs/chat';
import type { Identifier } from '@omujs/omu';
import type { Registry } from '@omujs/omu/api/registry';
import type { Signal } from '@omujs/omu/api/signal';
import type { Table } from '@omujs/omu/api/table';
import { ByteReader, ByteWriter, Serializer, type JsonType } from '@omujs/omu/serialize';
import { writable, type Writable } from 'svelte/store';
import { PALETTE_RGB } from '../colors';
import type { Item } from '../item';
import type { ItemPool, ItemSystemState } from '../item/item';
import type { OmucafeApp } from '../omucafe-app';
import type { SceneData } from '../scenes/scene';
import { getAssetKey, type Asset } from './asset';
import type { Game } from './game';
import { createTransform } from './transform';

interface State {
    wait(): Promise<void>;
    flush(): Promise<void>;
    getStringified(): string;
    ignore: boolean;
    serialize(): Uint8Array;
    deserialize(buffer: Uint8Array): void;
    resetState(): Promise<void>;
}

class ProxyTracker<T extends object> {
    private readonly originalSymbol = Symbol('Original');
    private readonly proxyCache = new WeakMap<object, any>();
    private readonly changes = new Map<symbol, any>();

    private readonly callback: (changed: boolean) => void;
    private readonly subscribers: Array<(value: T) => void> = [];
    #proxy: T;

    constructor(value: T, callback: (changed: boolean) => void) {
        this.callback = callback;
        this.#proxy = this.createProxy(value);
    }

    get changed() {
        return this.changes.size > 0;
    }

    get value() {
        return this.#proxy;
    }

    // 値が差し替わった場合に再ラップする
    set value(newValue: T) {
        this.#proxy = this.createProxy(newValue);
        this.changes.clear();
    }

    public subscribe(subscriber: (value: T) => void) {
        this.subscribers.push(subscriber);
    }

    public flush() {
        this.changes.clear();
    }

    private createProxy<U extends object>(target: U): U {
        // プリミティブやnullはそのまま返す
        if (typeof target !== 'object' || target === null) {
            return target;
        }

        // 既にこのTrackerでラップ済みのオブジェクトならキャッシュを返す
        if (this.proxyCache.has(target)) {
            return this.proxyCache.get(target);
        }

        if ((target as any)[this.originalSymbol]) {
            return target;
        }

        const fields: Map<keyof any, symbol> = new Map();

        const handler: ProxyHandler<U> = {
            get: (obj, prop, receiver) => {
                if (prop === this.originalSymbol) {
                    return obj;
                }
                const val = Reflect.get(obj, prop, receiver);
                // ネストされたオブジェクトも再帰的にプロキシ化（キャッシュ利用）
                if (typeof val === 'object' && val !== null) {
                    return this.createProxy(val);
                }
                return val;
            },
            set: (obj, prop, val, receiver) => {
                const current = Reflect.get(obj, prop, receiver);
                // 値が変わった場合のみ通知
                if (JSON.stringify(current) !== JSON.stringify(val)) {
                    const result = Reflect.set(obj, prop, val, receiver);
                    for (const subscriber of this.subscribers) {
                        subscriber(this.value);
                    }
                    let symbol = fields.get(prop);
                    if (!symbol) {
                        symbol = Symbol(prop.toString());
                        fields.set(prop, symbol);
                    }
                    if (this.changes.has(symbol)) {
                        const original = this.changes.get(symbol);
                        if (JSON.stringify(original) === JSON.stringify(val)) {
                            this.changes.delete(symbol);
                            if (this.changes.size === 0) {
                                this.callback(false); // 変更通知
                            }
                        }
                    } else {
                        if (this.changes.size === 0) {
                            this.callback(true); // 変更通知
                        }
                        this.changes.set(symbol, current);
                    }
                    return result;
                }
                return true;
            },
            deleteProperty: (obj, prop) => {
                if (prop in obj) {
                    let symbol = fields.get(prop);
                    if (!symbol) {
                        symbol = Symbol(prop.toString());
                        fields.set(prop, symbol);
                    }
                    if (!this.changes.has(symbol)) {
                        for (const subscriber of this.subscribers) {
                            subscriber(this.value);
                        }
                        if (this.changes.size === 0) {
                            this.callback(true); // 変更通知
                        }
                        this.changes.set(symbol, Reflect.get(obj, prop));
                    }
                }
                Reflect.deleteProperty(obj, prop);
                return true;
            },
        };

        const proxy = new Proxy(target, handler);
        this.proxyCache.set(target, proxy);
        return proxy;
    }
}

export class BufferedMap<T extends object> implements State {
    private map: Map<string, T> = new Map();
    // 生成したProxyをキャッシュして、getのたびに生成しないようにする
    private proxies: Map<string, ProxyTracker<T>> = new Map();

    private updated: Set<string> = new Set();
    private removed: Map<string, T> = new Map();
    private unlisten: (() => void)[] = [];

    constructor(
        public readonly table: Table<T>,
        listen: boolean,
        public readonly ignore = false,
    ) {
        if (listen) {
            this.unlisten.push(
                table.event.add.listen((items) => {
                    for (const [id, item] of items) {
                        this.map.set(id, item);
                        this.proxies.delete(id); // 元データが変わったらキャッシュを無効化
                    }
                }),
                table.event.update.listen((items) => {
                    for (const [id, item] of items) {
                        this.map.set(id, item);
                        this.proxies.delete(id); // キャッシュ無効化
                    }
                }),
                table.event.remove.listen((items) => {
                    for (const [id] of items) {
                        this.map.delete(id);
                        this.proxies.delete(id);
                        this.updated.delete(id);
                    }
                }),
            );
            table.listen();
        }
    }

    public async wait() {
        const items = await this.table.fetchAll();
        this.map = items;
        this.proxies.clear();
    }

    public entries(): MapIterator<[string, T]> {
        return this.map.entries();
    }

    public keys(): IterableIterator<string> {
        return this.map.keys();
    }

    public get size(): number {
        return this.map.size;
    }

    public values(): IterableIterator<T> {
        // values() でイテレートする場合も、できればProxy経由が望ましいが
        // パフォーマンス重視なら生データを返すか、必要に応じてProxy生成
        return this.map.values();
    }

    public clear() {
        this.removed = new Map(this.map);
        this.updated.clear();
        this.map.clear();
        this.proxies.clear();
    }

    public set(key: string, value: T) {
        this.map.set(key, value);
        this.proxies.delete(key); // 上書きされたらProxyを作り直す
        this.updated.add(key);
    }

    public has(key: string) {
        return this.map.has(key);
    }

    public delete(key: string) {
        const existed = this.map.get(key);
        if (existed) {
            this.map.delete(key);
            this.proxies.delete(key);
            this.removed.set(key, existed);
            this.updated.delete(key);
        }
    }

    public get(key: string): T | undefined {
        const tracker = this.getTracker(key);
        return tracker?.value;
    }

    public getTracker(key: string): ProxyTracker<T> | undefined {
        // キャッシュがあればそれを返す（超高速化）
        if (this.proxies.has(key)) {
            return this.proxies.get(key);
        }

        const item = this.map.get(key);
        if (!item) return undefined;

        // 新しいProxyを作り、キャッシュに保存
        const tracker = new ProxyTracker(item, (changed) => {
            if (changed) {
                this.updated.add(key);
            } else {
                this.updated.delete(key);
            }
        });

        this.proxies.set(key, tracker);
        return tracker;
    }

    public getStore(key: string): Writable<T> | undefined {
        const tracker = this.getTracker(key);
        if (!tracker) return;
        const store = writable(tracker.value);
        tracker.subscribe((newValue) => {
            store.set(newValue);
        });
        return store;
    }

    private getUpdated(): T[] {
        const result: T[] = [];
        for (const key of this.updated) {
            const proxy = this.proxies.get(key);
            if (proxy) {
                result.push(proxy.value);
                proxy.flush();
            } else {
                const value = this.map.get(key);
                if (value) {
                    result.push(value);
                }
            }
        }
        this.updated.clear();
        return result;
    }

    private getRemoved(): T[] {
        const result: T[] = Array.from(this.removed.values());
        this.removed.clear();
        return result;
    }

    public async flush() {
        const promises: Promise<any>[] = [];
        if (this.updated.size > 0) {
            promises.push(this.table.update(...this.getUpdated()));
        }
        if (this.removed.size > 0) {
            promises.push(this.table.remove(...this.getRemoved()));
        }
        await Promise.all(promises);
    }

    public destroy() {
        this.unlisten.forEach(u => u());
        this.unlisten = [];
    }

    public getStringified(): string {
        const obj: Record<string, T> = {};
        for (const [key, value] of this.map.entries()) {
            obj[key] = value;
        }
        return JSON.stringify(obj);
    }

    public serialize(keys?: string[]): Uint8Array {
        const writer = new ByteWriter();
        const entries: [string, T][] = keys
            ? keys.map(key => [key, this.map.get(key)] as [string, T | undefined])
                .filter(([, value]) => value !== undefined) as [string, T][]
            : Array.from(this.map.entries());
        writer.writeULEB128(entries.length);
        for (const [key, value] of entries) {
            writer.writeString(key);
            writer.writeUint8Array(this.table.type.serializer.serialize(value));
        }
        return writer.toUint8Array();
    }

    public async deserialize(buffer: Uint8Array): Promise<Map<string, T>> {
        const reader = ByteReader.fromUint8Array(buffer);
        const size = reader.readULEB128();
        const added = new Map<string, T>();
        for (let i = 0; i < size; i++) {
            const key = reader.readString();
            const valueBuffer = reader.readUint8Array();
            const value = this.table.type.serializer.deserialize(valueBuffer);
            this.map.set(key, value);
            added.set(key, value);
        }
        this.updated = new Set(this.map.keys());
        this.table.update(...added.values());
        return added;
    }

    public async resetState() {
        this.map.clear();
    }
}

export class BufferedRegistry<T extends object> implements State {
    #tracker: ProxyTracker<T>;
    public store: Writable<T>;
    public ignore = false;

    constructor(
        public readonly registry: Registry<T>,
        private readonly listen: boolean,
    ) {
        // Registryの値監視
        this.#tracker = new ProxyTracker(registry.value, () => {
            // Svelte storeにも通知が必要ならここで行う
            // this.store.set(this.#tracker.value);
        });

        this.store = registry.compatSvelte();

        registry.listen((newValue) => {
            // サーバー側から更新が来たらProxyのターゲットを差し替える
            if (!this.listen) return;
            this.#tracker.value = newValue;
        });

        this.store.subscribe((newValue) => {
            // Svelte側で代入が行われた場合
            if (this.listen) return;
            if (newValue !== this.#tracker.value) {
                this.#tracker.value = newValue;
            }
        });
    }

    public async wait() {
        const val = await this.registry.get();
        this.#tracker.value = val;
        this.store.set(val);
    }

    get value(): T {
        return this.#tracker.value;
    }

    set value(val: T) {
        if (this.listen) return;
        this.#tracker.value = val;
        this.store.set(val);
    }

    public async flush() {
        if (!this.#tracker.changed) return;
        this.#tracker.flush();
        await this.registry.set(this.#tracker.value);
    }

    public getStringified(): string {
        return JSON.stringify(this.#tracker.value);
    }

    public serialize(): Uint8Array {
        return this.registry.type.serializer.serialize(this.value);
    }

    public async deserialize(buffer: Uint8Array) {
        this.value = this.registry.type.serializer.deserialize(buffer);
        this.#tracker.flush();
        await this.registry.set(this.#tracker.value);
    }

    public async resetState() {
        await this.registry.set(this.registry.type.defaultValue);
        this.#tracker.value = this.registry.type.defaultValue;
        this.#tracker.flush();
    }
}

export interface TransitionOptions {
    title: string;
    duration: number;
}

export interface TransitionData {
    current: {
        to: SceneData;
        start: number;
        options: TransitionOptions;
    } | null;
}

type AssetPair<T> = Record<'asset' | 'client', T>;
type PartialAssets<T> = {
    [P in keyof T]?: T[P] extends Asset ? Asset : PartialAssets<T[P]>;
};

interface ShopData {
    shop: {
        name: string;
        address: string;
        owner: string;
    };
}

interface KitchenSkin {
    assets: PartialAssets<{
        vertical: {
            kitchen: AssetPair<{
                counter: Asset;
                kitchen: Asset;
                background: Asset;
            }>;
            photo: AssetPair<{
                photo_frame: Asset;
                counter: Asset;
                kitchen: Asset;
                background: Asset;
            }>;
        };
    }>;
}

interface CanvasEditClear {
    t: 'c';
}

interface CanvasEditBrushStart {
    t: 'bs';
    p: [x:number, y: number];
}

interface CanvasEditBrushMove {
    t: 'bm';
    p: [x: number, y: number];
}

interface CanvasEditBrushEnd {
    t: 'be';
    p: [x:number, y: number];
}

interface CanvasEditSetColor {
    t: 'sc';
    c: [
        x: number,
        y: number,
        z: number,
        w: number,
    ];
}

interface CanvasEditSetWidth {
    t: 'sw';
    w: number;
}

interface CanvasEditSetTool {
    t: 'st';
    k: 'brush' | 'eraser';
}

export type BrushCommand = CanvasEditBrushStart | CanvasEditBrushMove | CanvasEditBrushEnd;
export type CanvasCommand = CanvasEditClear | BrushCommand | CanvasEditSetColor | CanvasEditSetWidth | CanvasEditSetTool;

export interface CanvasEditChunk {
    i: number;
    c: CanvasCommand[];
}

export const DEFAULT_PHOTO_CONFIG = {
    frame: true,
    effects: {
        bloom: true,
        flash: true,
    },
};

export interface CanvasState {
    tool: {
        type: 'brush';
        color: Vec4Like;
    } | {
        type: 'eraser';
    } | {
        type: 'move';
    };
    pos: Vec2Like;
}

export type PhotoConfig = typeof DEFAULT_PHOTO_CONFIG;

export interface ExportConfig {
    name: string;
}

interface Config {
    obs?: {
        scene_uuid: string;
        background_uuid?: string;
        overlay_uuid?: string;
    };
    canvas: {
        sacle: number;
        rotation: number;
        brush: {
            color: Vec4Like;
            width: number;
        };
        eraser: {
            width: number;
        };
        tool?: {
            type: 'brush';
        } | {
            type: 'eraser';
        } | {
            type: 'move';
        };
    };
    audio: {
        masterVolume: number;
        musicVolume: number;
        sfxVolume: number;
    };
    photo: PhotoConfig;
    export?: ExportConfig;
}

export interface User {
    source: {
        type: 'chat';
        id: string;
    } | {
        type: 'task';
        id: string;
    };
    name: string;
    avatar?: string;
}

export interface Stamp {
    timestamp: number;
}

export interface Customer {
    id: string;
    user: User;
    stats: {
        totalOrders: number;
        stamps: (Stamp | null)[];
    };
}

export interface Product {
    id: string;
    itemId: string;
    name: string;
    aliases: string[];
    hidden: boolean;
}

export interface Order {
    id: string;
    customer: Customer;
    products: Product[];
    timestamp: number;
    startTime: number;
    lastMessage?: Models.MessageJson;
}

export interface OrderState {
    order?: Order;
}

export interface Receipt {
    id: string;
    order: Order;
    screenshot?: Asset;
    date: string;
}

export class GameState {
    private states: State[] = [];
    public items: BufferedMap<Item>;
    public assets: BufferedMap<Asset>;
    public kitchen: BufferedRegistry<ItemPool>;
    public counter: BufferedRegistry<ItemPool>;
    public fridge: BufferedRegistry<ItemPool>;
    public factory: BufferedRegistry<ItemPool>;
    public exportPool: BufferedRegistry<ItemPool>;
    public itemStates: BufferedRegistry<ItemSystemState>;
    public scene: BufferedRegistry<SceneData>;
    public transition: BufferedRegistry<TransitionData>;
    public shop: BufferedRegistry<ShopData>;
    public config: BufferedRegistry<Config>;
    public skin: BufferedRegistry<KitchenSkin>;
    public canvasEditHeap: BufferedMap<CanvasEditChunk>;
    public canvasEditStack: BufferedRegistry<CanvasEditChunk>;
    public canvasEditSignal: Signal<CanvasEditChunk>;
    public canvasStates: BufferedRegistry<CanvasState>;
    public orders: BufferedMap<Order>;
    public products: BufferedMap<Product>;
    public receipts: BufferedMap<Receipt>;
    public customers: BufferedMap<Customer>;

    private register<T extends State>(state: T): T {
        this.states.push(state);
        return state;
    }

    constructor(
        private readonly omucafe: OmucafeApp,
    ) {
        const { omu } = omucafe;
        const listen = omucafe.side !== 'client';
        const items = this.register(new BufferedMap(omu.tables.json<Item>('items', {
            key: (item) => item.id,
        }), listen, true));
        const assets = this.register(new BufferedMap(omu.tables.json<Asset>('assets', {
            key: (asset) => getAssetKey(asset),
        }), listen, true));
        const kitchen = this.register(new BufferedRegistry(omu.registries.json<ItemPool>('kitchen', {
            default: {
                id: 'kitchen',
                items: {},
            },
        }), listen));
        const counter = this.register(new BufferedRegistry(omu.registries.json<ItemPool>('counter', {
            default: {
                id: 'counter',
                items: {},
            },
        }), listen));
        const fridge = this.register(new BufferedRegistry(omu.registries.json<ItemPool>('fridge', {
            default: {
                id: 'fridge',
                items: {},
            },
        }), listen));
        const factory = this.register(new BufferedRegistry(omu.registries.json<ItemPool>('factory', {
            default: {
                id: 'factory',
                items: {},
            },
        }), listen));
        const exportPool = this.register(new BufferedRegistry(omu.registries.json<ItemPool>('export', {
            default: {
                id: 'export',
                items: {},
            },
        }), listen));
        const itemStates = this.register(new BufferedRegistry(omu.registries.json<ItemSystemState>('itemStates', {
            default: { },
        }), listen));
        const scene = this.register(new BufferedRegistry(omu.registries.json<SceneData>('scene', {
            default: { 'type': 'main_menu' },
        }), listen));
        const transition = this.register(new BufferedRegistry(omu.registries.json<TransitionData>('transition', {
            default: {
                current: null,
            },
        }), listen));
        const shop = this.register(new BufferedRegistry(omu.registries.json<ShopData>('shop', {
            default: {
                shop: {
                    name: '',
                    address: '',
                    owner: '',
                },
            },
        }), listen));
        const config = this.register(new BufferedRegistry(omu.registries.json<Config>('config', {
            default: {
                canvas: {
                    sacle: 1,
                    rotation: 0,
                    brush: {
                        color: PALETTE_RGB.ACCENT,
                        width: 10,
                    },
                    eraser: {
                        width: 20,
                    },
                },
                audio: {
                    masterVolume: 1,
                    musicVolume: 1,
                    sfxVolume: 1,
                },
                photo: {
                    frame: true,
                    effects: {
                        bloom: true,
                        flash: true,
                    },
                },
            },
            serializer: Serializer.transform<Config>((config) => {
                if (!config.canvas) {
                    config.canvas = {
                        sacle: 1,
                        rotation: 0,
                        brush: {
                            color: PALETTE_RGB.ACCENT,
                            width: 10,
                        },
                        eraser: {
                            width: 20,
                        },
                    };
                }
                if (!config.photo) {
                    config.photo = {
                        frame: true,
                        effects: {
                            bloom: true,
                            flash: true,
                        },
                    };
                }
                if (!config.audio) {
                    config.audio = {
                        masterVolume: 1,
                        musicVolume: 1,
                        sfxVolume: 1,
                    };
                }
                return config;
            }),
        }), listen));
        const skin = this.register(new BufferedRegistry(omu.registries.json<KitchenSkin>('skin', {
            default: {
                assets: {},
            },
        }), listen));
        const canvasEditHeap = this.register(new BufferedMap(omu.tables.json<CanvasEditChunk>('canvas_edit_heap', {
            key: (edit) => edit.i.toString(),
        }), listen));
        const canvasEditStack = this.register(new BufferedRegistry(omu.registries.json<CanvasEditChunk>('canvas_edit_stack', {
            default: {
                i: 0,
                c: [],
            },
        }), listen));
        const canvasEditSignal = omu.signals.json<CanvasEditChunk>('canvas_edit_signal');
        const canvasStates = this.register(new BufferedRegistry(omu.registries.json<CanvasState>('canvas_states', {
            default: {
                tool: {
                    type: 'move',
                },
                pos: Vec2.ZERO,
            },
        }), listen));
        const orders = this.register(new BufferedMap(omu.tables.json<Order>('orders', {
            key: (order) => order.id,
        }), listen));
        const products = this.register(new BufferedMap(omu.tables.json<Product>('products', {
            key: (product) => product.id,
        }), listen));
        const receipts = this.register(new BufferedMap(omu.tables.json<Receipt>('receipts', {
            key: (product) => product.id,
        }), listen));
        const customers = this.register(new BufferedMap(omu.tables.json<Customer>('customers', {
            key: (customer) => customer.id,
        }), listen));

        this.items = items;
        this.assets = assets;
        this.kitchen = kitchen;
        this.counter = counter;
        this.fridge = fridge;
        this.factory = factory;
        this.exportPool = exportPool;
        this.itemStates = itemStates;
        this.scene = scene;
        this.transition = transition;
        this.shop = shop;
        this.config = config;
        this.skin = skin;
        this.canvasEditHeap = canvasEditHeap;
        this.canvasEditStack = canvasEditStack;
        this.canvasEditSignal = canvasEditSignal;
        this.canvasStates = canvasStates;
        this.orders = orders;
        this.products = products;
        this.receipts = receipts;
        this.customers = customers;
    }

    public async wait() {
        await Promise.all(this.states.map((state) => state.wait()));
    }

    public async flush() {
        if (this.omucafe.side === 'client') {
            await Promise.all(this.states.map((state) => state.flush()));
        }
    }

    public async resetAll() {
        for (const state of this.states) {
            await state.resetState();
        }
    }

    public getAllJsonStringified(ignore?: State): string {
        const result = [];
        for (const state of this.states) {
            if (state === ignore) continue;
            result.push(state.getStringified());
        }
        return result.join('');
    }

    private getReferencedAssets(references: string): Map<string, Asset> {
        const referenced = new Map<string, Asset>();
        for (const asset of this.assets.values()) {
            if (asset.type === 'url') continue;
            const id = getAssetKey(asset);
            const included = references.includes(id) || references.includes(asset.id);
            if (included) {
                referenced.set(id, asset);
            }
        }
        return referenced;
    }

    public async serializeAssets(references?: string) {
        const assets = this.getReferencedAssets(references ?? this.getAllJsonStringified(this.assets));
        const writer = new ByteWriter();
        writer.writeULEB128(assets.size);
        for (const asset of assets.values()) {
            if (asset.type === 'url') continue;
            const id = this.getAssetId(asset.id);
            const { buffer } = await this.omucafe.omu.assets.download(id);
            writer.writeString(asset.id);
            writer.writeUint8Array(buffer);
        }
        return writer.toUint8Array();
    }

    private getAssetId(id: string): Identifier {
        const { omu } = this.omucafe;
        return omu.app.id.base.join('asset', id);
    }

    public async deserializeAssets(buffer: Uint8Array) {
        const reader = ByteReader.fromUint8Array(buffer);
        const count = reader.readULEB128();
        for (let i = 0; i < count; i++) {
            const id = reader.readString();
            const data = reader.readUint8Array();
            const asset: Asset = {
                type: 'asset',
                id,
            };
            if (!this.assets.has(id)) {
                await this.omucafe.omu.assets.upload(this.getAssetId(id), data);
            }
            this.assets.set(id, asset);
        }
    }
}

class AssetPackData<Buffers extends Record<string, Uint8Array | undefined>, T extends JsonType> {
    private static HEADER = 'omupk';
    private static VERSION = 0;

    constructor(
        public readonly buffers: Buffers,
        public readonly data: T,
    ) {}

    public static deserialize<Buffers extends Record<string, Uint8Array | undefined>, T extends JsonType>(buffer: Uint8Array): AssetPackData<Buffers, T> {
        const reader = ByteReader.fromUint8Array(buffer);
        const header = reader.readString();
        if (header !== AssetPackData.HEADER) {
            throw new Error('Invalid asset pack');
        }
        const version = reader.readULEB128();
        if (version !== AssetPackData.VERSION) {
            throw new Error('Unsupported asset pack version');
        }
        const data = reader.readJSON() as JsonType;
        const buffers: Record<string, Uint8Array> = {};
        const count = reader.readULEB128();
        for (let i = 0; i < count; i++) {
            const id = reader.readString();
            const buf = reader.readUint8Array();
            buffers[id] = buf;
        }
        return new AssetPackData<Buffers, T>(buffers as Buffers, data as T);
    }

    public serialize() {
        const writer = new ByteWriter();
        writer.writeString(AssetPackData.HEADER);
        writer.writeULEB128(AssetPackData.VERSION);
        writer.writeJSON(this.data);
        const entries = Object.entries(this.buffers).filter(([_, buf]) => buf !== undefined) as [string, Uint8Array][];
        writer.writeULEB128(entries.length);
        for (const [id, buffer] of entries) {
            writer.writeString(id);
            writer.writeUint8Array(buffer);
        }
        return writer.finish();
    }
}

type KitchenPackBuffers = {
    assets: Uint8Array;
    items: Uint8Array;
    kitchen: Uint8Array;
    counter: Uint8Array;
    fridge: Uint8Array;
    factory: Uint8Array;
    products: Uint8Array;
    skin: Uint8Array;
};

type KitchenPackData = {
    type: 'kitchen';
    name: string;
};

export class CafePack {
    constructor(
        private readonly pack: AssetPackData<KitchenPackBuffers, KitchenPackData>,
    ) {}

    get data() {
        return this.pack.data;
    }

    public static async create(state: GameState) {
        const assets = await state.serializeAssets();
        const items = state.items.serialize();
        const kitchen = state.kitchen.serialize();
        const counter = state.counter.serialize();
        const fridge = state.fridge.serialize();
        const factory = state.factory.serialize();
        const products = state.products.serialize();
        const skin = state.skin.serialize();
        const data = new AssetPackData<KitchenPackBuffers, KitchenPackData>({
            items,
            assets,
            kitchen,
            counter,
            fridge,
            factory,
            products,
            skin,
        }, {
            type: 'kitchen',
            name: state.shop.value.shop.name,
        });
        return new CafePack(data);
    }

    public static load(buffer: Uint8Array): CafePack {
        const data = AssetPackData.deserialize<KitchenPackBuffers, KitchenPackData>(buffer);
        return new CafePack(data);
    }

    public async apply(game: Game) {
        const { states } = game;
        states.items.clear();
        states.products.clear();
        await states.items.deserialize(this.pack.buffers.items);
        await states.deserializeAssets(this.pack.buffers.assets);
        await states.kitchen.deserialize(this.pack.buffers.kitchen);
        await states.counter.deserialize(this.pack.buffers.counter);
        await states.fridge.deserialize(this.pack.buffers.fridge);
        await states.factory.deserialize(this.pack.buffers.factory);
        await states.products.deserialize(this.pack.buffers.products);
        await states.skin.deserialize(this.pack.buffers.skin);

        game.addTask(async () => {
            game.startTransition({
                type: 'kitchen',
            }, {
                title: `${this.data.name}を準備中…`,
                duration: 2000,
            });
        });
    }

    public download(filename: string) {
        const blob = new Blob([this.pack.serialize()], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
    }
}

type ItemPackBuffers = {
    assets: Uint8Array;
    items: Uint8Array;
};

type ItemPackData = {
    type: 'item';
    name: string;
};

const decoder = new TextDecoder();

export class ItemPack {
    constructor(
        private readonly pack: AssetPackData<ItemPackBuffers, ItemPackData>,
    ) {}

    get data() {
        return this.pack.data;
    }

    public static async create(state: GameState, keys: string[], data: ItemPackData) {
        const items = state.items.serialize(keys);
        const assets = await state.serializeAssets(decoder.decode(items));
        const pack = new AssetPackData<ItemPackBuffers, ItemPackData>({
            items,
            assets,
        }, data);
        return new ItemPack(pack);
    }

    public static load(buffer: Uint8Array): ItemPack {
        const data = AssetPackData.deserialize<ItemPackBuffers, ItemPackData>(buffer);
        return new ItemPack(data);
    }

    public async spawn(game: Game) {
        const { states, itemRenderer } = game;
        await states.deserializeAssets(this.pack.buffers.assets);
        const items = await states.items.deserialize(this.pack.buffers.items);

        itemRenderer.initPass();
        itemRenderer.addPool({
            pool: {
                id: 'export',
                items: {},
                soundEffects: {},
            },
            name: '工場',
            align: Vec2.ZERO,
            bounds: AABB2.ZEROONE,
            transform: createTransform(),
            ordering: 'latest',
        });
        const pool = game.states.factory.value;
        itemRenderer.addPool({
            pool,
            name: '工場',
            align: Vec2.ZERO,
            bounds: AABB2.ZEROONE,
            transform: createTransform(),
            ordering: 'latest',
        });

        const entries = [...items.values()];
        const rootItems = entries.filter((item) => !item.parent);
        for (let index = 0; index < rootItems.length; index++) {
            const item = rootItems[index];
            const clone = game.item.clone(item);
            const x = rootItems.length === 1 ? 0 : lerp(
                -200,
                200,
                invLerp(0, rootItems.length - 1, index),
            );
            clone.transform.offset = { x, y: index };
            game.item.setPool(clone, pool);
        }
        game.states.factory.value = pool;
    }

    public async download(filename: string) {
        const blob = new Blob([this.pack.serialize()], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
    }
}

