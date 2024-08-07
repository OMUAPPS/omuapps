import { makeRegistryWritable } from '$lib/helper.js';
import { Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/extension/registry/registry.js';
import { type Writable } from 'svelte/store';
import { APP_ID } from './app.js';
import type { BreakTimerState } from './state.js';

export type BreakTimerConfig = {
    switchScene: {
        scene: string;
    } | null;
    timer: {
        duration: number;
        message: string;
    } | null;
};

const BREAK_TIMER_CONFIG_REGISTRY_TYPE = RegistryType.createJson<BreakTimerConfig>(APP_ID, {
    name: 'config',
    defaultValue: {
        switchScene: null,
        timer: {
            duration: 10 * 60,
            message: 'ひと休憩',
        },
    },
});

const BREAK_TIMER_STATE_REGISTRY_TYPE = RegistryType.createJson<BreakTimerState>(APP_ID, {
    name: 'state',
    defaultValue: {
        type: 'work',
    },
});

export class BreakTimerApp {
    public readonly config: Writable<BreakTimerConfig>;
    public readonly state: Writable<BreakTimerState>;

    constructor(public readonly omu: Omu) {
        this.config = makeRegistryWritable(omu.registry.get(BREAK_TIMER_CONFIG_REGISTRY_TYPE));
        this.state = makeRegistryWritable(omu.registry.get(BREAK_TIMER_STATE_REGISTRY_TYPE));
    }
}
