import { makeRegistryWritable } from '$lib/helper.js';
import type { Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/extension/registry/registry.js';
import { get, type Writable } from 'svelte/store';
import { APP_ID } from './app.js';
import type { RouletteEntry, State } from './state.js';

export type Config = {
    text: string;
};

const CONFIG_REGISTRY = RegistryType.createJson<Config>(APP_ID, {
    name: 'config',
    defaultValue: {
        text: '',
    },
});

const ENTRIES_REGISTRY = RegistryType.createJson<Record<string, RouletteEntry>>(APP_ID, {
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
    public entries: Writable<Record<string, RouletteEntry>>;

    constructor(omu: Omu) {
        this.config = makeRegistryWritable(omu.registry.get(CONFIG_REGISTRY));
        this.state = makeRegistryWritable(omu.registry.get(STATE_REGISTRY));
        this.entries = makeRegistryWritable(omu.registry.get(ENTRIES_REGISTRY));
    }

    public addEntry(entry: RouletteEntry) {
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

    public setEntries(entries: Record<string, RouletteEntry>) {
        this.entries.set(entries);
    }

    public clearEntries() {
        this.entries.set({});
    }

    public spin() {
        const entries = Object.values(get(this.entries));
        const entry = entries[Math.floor(Math.random() * entries.length)];
        // const duration = 3000 + Math.random() * 3000;
        const start = Date.now();
        const duration = 1000;
        this.state.set({ type: 'spin-start' });
        this.state.set({ type: 'spinning', result: { entry }, start, duration });

        setTimeout(() => {
            this.state.set({ type: 'spin-result', result: { entry } });
            alert(`Winner: ${entry.name}`);
        }, duration);
    }
}
