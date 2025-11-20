import { BetterMath } from '$lib/math.js';
import { lerp } from '$lib/math/math.js';
import type { Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/api/registry';
import seedrandom from 'seedrandom';
import { get, type Writable } from 'svelte/store';
import { APP_ID } from './app.js';
import type { RouletteItem, State } from './state.js';

export type Config = {
    duration: number;
    editable: boolean;
};

const CONFIG_REGISTRY = RegistryType.createJson<Config>(APP_ID, {
    name: 'config',
    defaultValue: {
        duration: 10,
        editable: true,
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
    public rouletteState: Writable<State>;
    public entries: Writable<Record<string, RouletteItem>>;

    constructor(omu: Omu) {
        this.config = omu.registries.get(CONFIG_REGISTRY).compatSvelte();
        this.rouletteState = omu.registries.get(STATE_REGISTRY).compatSvelte();
        this.entries = omu.registries.get(ENTRIES_REGISTRY).compatSvelte();
    }

    public addEntry(...entry: RouletteItem[]) {
        this.entries.update((entries) => {
            for (const e of entry) {
                entries[e.id] = e;
            }
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

    public toggleRecruiting() {
        this.rouletteState.update((state) => {
            if (state.type === 'recruiting') {
                return { type: 'idle' };
            }
            return { type: 'recruiting' };
        });
    }

    private easeInOutCubic(x: number): number {
        x = lerp(0.1, 0.9, x);
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }

    private spinTimeout: number | null = null;

    public spin() {
        const seed = Date.now();
        const rng = seedrandom(seed.toString());
        const config = get(this.config);
        this.entries.update((value) => {
            if (Object.keys(value).length === 0) {
                throw new Error('No entries to spin');
            }
            const entries = Object.values(value);
            const entry = entries[Math.floor(rng() * entries.length)];
            const start = Date.now();
            const duration = config.duration * 1000;
            const random = this.easeInOutCubic(BetterMath.invjsrandom());
            this.rouletteState.set({ type: 'spin-start' });
            this.rouletteState.set({ type: 'spinning', random, result: { entry }, start, duration });

            this.spinTimeout = window.setTimeout(() => {
                this.rouletteState.set({ type: 'spin-result', random, result: { entry } });
            }, duration);
            return value;
        });
    }

    public stop() {
        if (this.spinTimeout) {
            clearTimeout(this.spinTimeout);
        }
        this.rouletteState.update(() => ({
            type: 'idle',
        }));
    }
}
