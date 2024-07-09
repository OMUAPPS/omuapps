import { makeRegistryWritable } from '$lib/helper.js';
import type { Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/extension/registry/registry.js';
import { get, type Writable } from 'svelte/store';
import { APP_ID } from './app.js';
import type { RouletteItem, State } from './state.js';
import { BetterMath } from '$lib/math.js';
import { lerp } from '$lib/math/math.js';

export type Config = {
    duration: number;
};

const CONFIG_REGISTRY = RegistryType.createJson<Config>(APP_ID, {
    name: 'config',
    defaultValue: {
        duration: 5,
    },
});

const ENTRIES_REGISTRY = RegistryType.createJson<Record<string, RouletteItem>>(APP_ID, {
    name: 'entries',
    defaultValue: {},
});

const STATE_REGISTRY = RegistryType.createJson<State>(APP_ID, {
    name: 'state',
    defaultValue: {
        type: 'idle',
    },
});

export class RouletteApp {
    public config: Writable<Config>;
    public state: Writable<State>;
    public entries: Writable<Record<string, RouletteItem>>;

    constructor(omu: Omu) {
        this.config = makeRegistryWritable(omu.registry.get(CONFIG_REGISTRY));
        this.state = makeRegistryWritable(omu.registry.get(STATE_REGISTRY));
        this.entries = makeRegistryWritable(omu.registry.get(ENTRIES_REGISTRY));
    }

    public addEntry(entry: RouletteItem) {
        this.entries.update((entries) => {
            entries[entry.id] = entry;
            return entries;
        });
    }

    public removeEntry(id: string) {
        this.entries.update((entries) => {
            delete entries[id];
            return entries;
        });
    }

    public updateEntry(entry: RouletteItem) {
        this.entries.update((entries) => {
            entries[entry.id] = entry;
            return entries;
        });
    }

    public setEntries(entries: Record<string, RouletteItem>) {
        this.entries.set(entries);
    }

    public clearEntries() {
        this.entries.set({});
    }

    private easeInOutCubic(x: number): number {
        x = lerp(0.1, 0.9, x);
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }

    public spin() {
        const config = get(this.config);
        this.entries.update((value) => {
            const entries = Object.values(value);
            const entry = entries[Math.floor(Math.random() * entries.length)];
            const start = Date.now();
            const duration = config.duration * 1000;
            const random = this.easeInOutCubic(BetterMath.invjsrandom());
            // const duration = 10000;
            this.state.set({ type: 'spin-start' });
            this.state.set({ type: 'spinning', random, result: { entry }, start, duration });

            setTimeout(() => {
                this.state.set({ type: 'spin-result', random, result: { entry } });
                alert(`Winner: ${entry.name}`);
            }, duration);
            return value;
        });
    }
}
