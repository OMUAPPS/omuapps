
import type { Registry } from '@omujs/omu/api/registry';
import type { Table } from '@omujs/omu/api/table';
import { writable, type Writable } from 'svelte/store';
import type { Item } from '../item';
import type { ItemPool, ItemSystemState } from '../item/item';
import type { OmucafeApp } from '../omucafe-app';
import type { SceneData } from '../scenes/scene';
import { getAssetKey, type Asset } from './asset';

interface State {
    wait(): Promise<void>;
    flush(): Promise<void>;
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
                    const result = Reflect.set(obj, prop, val, receiver);
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
        private readonly table: Table<T>,
        listen: boolean,
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
}

export class BufferedRegistry<T extends object> implements State {
    #tracker: ProxyTracker<T>;
    public store: Writable<T>;

    constructor(
        public readonly registry: Registry<T>,
    ) {
        // Registryの値監視
        this.#tracker = new ProxyTracker(registry.value, () => {
            // Svelte storeにも通知が必要ならここで行う
            this.store.set(this.#tracker.value);
        });

        this.store = registry.compatSvelte();

        registry.listen((newValue) => {
            // サーバー側から更新が来たらProxyのターゲットを差し替える
            this.#tracker.value = newValue;
        });

        this.store.subscribe((newValue) => {
            // Svelte側で代入が行われた場合
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
        this.#tracker.value = val;
        this.store.set(val);
    }

    public async flush() {
        if (!this.#tracker.changed) return;
        this.#tracker.flush();
        await this.registry.set(this.#tracker.value);
    }
}

interface TransitionData {
    current: {
        to: SceneData;
        start: number;
    } | null;
}

interface ShopData {
    shop: {
        name: string;
        address: string;
        owner: string;
    };
}

interface CanvasEditBrushStart {
    t: 'bs';
    p: [x:number, y: number];
}

interface CanvasEditBrushMove {
    t: 'bm';
    d: [x: number, y: number];
}

interface CanvasEditBrushEnd {
    t: 'be';
}

type CanvasEdit = (CanvasEditBrushStart | CanvasEditBrushMove | CanvasEditBrushEnd);

interface CanvasEditChunk {
    i: number;
    e: CanvasEdit[];
}

interface Config {
    obs?: {
        scene_uuid: string;
        background_uuid?: string;
        overlay_uuid?: string;
    };
}

export class GameState {
    private states: State[] = [];
    public items: BufferedMap<Item>;
    public assets: BufferedMap<Asset>;
    public kitchen: BufferedRegistry<ItemPool>;
    public counter: BufferedRegistry<ItemPool>;
    public fridge: BufferedRegistry<ItemPool>;
    public factory: BufferedRegistry<ItemPool>;
    public itemStates: BufferedRegistry<ItemSystemState>;
    public scene: BufferedRegistry<SceneData>;
    public transition: BufferedRegistry<TransitionData>;
    public shop: BufferedRegistry<ShopData>;
    public config: BufferedRegistry<Config>;
    public canvasEdits: BufferedMap<CanvasEditChunk>;

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
        }), listen));
        const assets = this.register(new BufferedMap(omu.tables.json<Asset>('assets', {
            key: (asset) => getAssetKey(asset),
        }), listen));
        const kitchen = this.register(new BufferedRegistry(omu.registries.json<ItemPool>('kitchen', {
            default: {
                id: 'kitchen',
                items: {},
            },
        })));
        const counter = this.register(new BufferedRegistry(omu.registries.json<ItemPool>('counter', {
            default: {
                id: 'counter',
                items: {},
            },
        })));
        const fridge = this.register(new BufferedRegistry(omu.registries.json<ItemPool>('fridge', {
            default: {
                id: 'fridge',
                items: {},
            },
        })));
        const factory = this.register(new BufferedRegistry(omu.registries.json<ItemPool>('factory', {
            default: {
                id: 'factory',
                items: {},
            },
        })));
        const itemStates = this.register(new BufferedRegistry(omu.registries.json<ItemSystemState>('itemStates', {
            default: { },
        })));
        const scene = this.register(new BufferedRegistry(omu.registries.json<SceneData>('scene', {
            default: { 'type': 'main_menu' },
        })));
        const transition = this.register(new BufferedRegistry(omu.registries.json<TransitionData>('transition', {
            default: {
                current: null,
            },
        })));
        const shop = this.register(new BufferedRegistry(omu.registries.json<ShopData>('shop', {
            default: {
                shop: {
                    name: '',
                    address: '',
                    owner: '',
                },
            },
        })));
        const config = this.register(new BufferedRegistry(omu.registries.json<Config>('config', {
            default: {
            },
        })));
        const canvasEdits = this.register(new BufferedMap(omu.tables.json<CanvasEditChunk>('canvas_edits', {
            key: (edit) => edit.i.toString(),
        }), listen));

        this.items = items;
        this.assets = assets;
        this.kitchen = kitchen;
        this.counter = counter;
        this.fridge = fridge;
        this.factory = factory;
        this.itemStates = itemStates;
        this.scene = scene;
        this.transition = transition;
        this.shop = shop;
        this.config = config;
        this.canvasEdits = canvasEdits;
    }

    public async wait() {
        await Promise.all(this.states.map((state) => state.wait()));
    }

    public async flush() {
        if (this.omucafe.side === 'client') {
            await Promise.all(this.states.map((state) => state.flush()));
        }
    }
}
