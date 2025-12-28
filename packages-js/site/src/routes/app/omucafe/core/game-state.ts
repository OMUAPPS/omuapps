import type { Omu } from '@omujs/omu';
import type { Registry } from '@omujs/omu/api/registry';
import type { Table } from '@omujs/omu/api/table';
import type { Writable } from 'svelte/store';
import type { Item } from '../item';
import type { ItemPool } from '../item/item';
import type { SceneData } from '../scenes/scene';

export class BufferedMap<T> {
    constructor(
        private readonly table: Table<T>,
    ) {
        table.listen((map) => {
            this.map = map;
        });
    }

    private map: Map<string, T> = new Map();
    private updated: Set<string> = new Set();
    private removed: Map<string, T> = new Map();

    public async wait() {
        this.map = await this.table.fetchAll();
    }

    public values(): IterableIterator<T> {
        return this.map.values();
    }

    public set(key: string, value: T) {
        this.map.set(key, value);
        this.updated.add(key);
        this.removed.delete(key);
    }

    public delete(key: string) {
        const existed = this.map.get(key);
        if (existed) {
            this.map.delete(key);
            this.removed.set(key, existed);
            this.updated.delete(key);
        }
    }

    public get(key: string): T | undefined {
        return this.map.get(key);
    }

    private getUpdated(): T[] {
        const result: T[] = [];
        for (const key of this.updated) {
            const value = this.map.get(key);
            if (value) {
                result.push(value);
            }
        }
        this.updated.clear();
        return result;
    }

    private getRemoved(): T[] {
        const result: T[] = [];
        for (const key of this.removed.keys()) {
            const value = this.removed.get(key);
            if (value) {
                result.push(value);
            }
        }
        this.removed.clear();
        return result;
    }

    public async flush() {
        if (this.updated.size > 0) {
            await this.table.update(...this.getUpdated());
        }
        if (this.removed.size > 0) {
            await this.table.remove(...this.getRemoved());
        }
    }
}

const TRACK_SYMBOL = Symbol('TrackingId');
export class BufferedRegistry<T> {
    #value: T;
    #changed: boolean = false;
    public store: Writable<T>;

    constructor(
        public readonly registry: Registry<T>,
    ) {
        this.#value = registry.value;
        this.store = registry.compatSvelte();
        registry.listen((newValue) => {
            this.#value = newValue;
        });
        this.store.subscribe((newValue) => {
            this.#value = newValue;
        });
    }

    public async wait() {
        this.#value = await this.registry.get();
    }

    get value(): T {
        return this.#value;
    }

    set value(val: T) {
        this.#value = this.trackChange(val);
        this.#changed = true;
    }

    private trackChange<T>(value: T) {
        if (!value) return value;
        if (typeof value !== 'object') return value;
        if (TRACK_SYMBOL in value) return value;
        Object.defineProperty(value, TRACK_SYMBOL, {
            value: true,
            enumerable: false,
            configurable: false,
        });
        const handler: ProxyHandler<any> = {
            get: (target, prop) => {
                const val = target[prop];
                return this.trackChange(val);
            },
            set: (target, prop, val) => {
                if (val !== target[prop]) {
                    this.#changed = true;
                }
                target[prop] = this.trackChange(val);
                return true;
            },
            deleteProperty: (target, prop) => {
                if (prop in target) {
                    this.#changed = true;
                }
                delete target[prop];
                return true;
            },
        };
        return new Proxy(value, handler);
    }

    public async flush() {
        if (!this.#changed) return;
        this.#changed = false;
        await this.registry.set(this.#value);
    }
}

export class GameState {
    private constructor(
        public items: BufferedMap<Item>,
        public kitchen: BufferedRegistry<ItemPool>,
        public scene: BufferedRegistry<SceneData>,
    ) { }

    public static async new(omu: Omu) {
        const items = new BufferedMap(omu.tables.json<Item>('items', {
            key: (item) => item.id,
        }));
        const kitchen = new BufferedRegistry(omu.registries.json<ItemPool>('kitchen', {
            default: { items: {} },
        }));
        const scene = new BufferedRegistry(omu.registries.json<SceneData>('scene', {
            default: { 'type': 'main_menu' },
        }));
        await Promise.all([
            items.wait(),
            kitchen.wait(),
            scene.wait(),
        ]);
        return new GameState(
            items,
            kitchen,
            scene,
        );
    }

    public async flush() {
        await this.items.flush();
        await this.scene.flush();
    }
}
