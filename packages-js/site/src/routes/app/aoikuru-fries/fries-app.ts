import { makeRegistryWritable } from '$lib/helper.js';
import type { Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/extension/registry/registry.js';
import { SignalType, type Signal } from '@omujs/omu/extension/signal/signal.js';
import type { Writable } from 'svelte/store';
import { IDENTIFIER } from './app.js';
import type { State } from './state.js';

const TEST_SIGNAL = SignalType.createJson<null>(IDENTIFIER, {
    name: 'test',
});

type Config = {
    text: string;
    hint: string;
};

const CONFIG_REGISTRY = RegistryType.createJson<Config>(IDENTIFIER, {
    name: 'config',
    defaultValue: {
        text: '芋準備中',
        hint: 'コメントで🍟を投げてみよう！',
    },
});

const STATE_REGISTRY = RegistryType.createJson<State>(IDENTIFIER, {
    name: 'state',
    defaultValue: {
        type: 'idle',
    },
});

export class FriesApp {
    public testSignal: Signal<null>;
    public config: Writable<Config>;
    public state: Writable<State>;

    constructor(omu: Omu) {
        this.testSignal = omu.signals.get(TEST_SIGNAL);
        this.config = makeRegistryWritable(omu.registries.get(CONFIG_REGISTRY));
        this.state = makeRegistryWritable(omu.registries.get(STATE_REGISTRY));
    }

    public async test() {
        this.testSignal.notify(null);
    }
}
