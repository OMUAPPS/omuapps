import { makeRegistryWritable } from '$lib/helper.js';
import type { Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/extension/registry/registry.js';
import type { Writable } from 'svelte/store';
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
}
