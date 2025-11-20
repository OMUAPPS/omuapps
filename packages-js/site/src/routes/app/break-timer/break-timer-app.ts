import type { OBSPlugin } from '@omujs/obs';
import { Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/api/registry';
import { get, type Writable } from 'svelte/store';
import { APP_ID } from './app.js';
import type { BreakTimerState } from './state.js';

export type BreakTimerConfig = {
    switch: {
        scene: string | null;
    };
    timer: {
        duration: number;
        message: string;
    };
    message: string;
};

const BREAK_TIMER_CONFIG_REGISTRY_TYPE = RegistryType.createJson<BreakTimerConfig>(APP_ID, {
    name: 'config',
    defaultValue: {
        switch: {
            scene: null,
        },
        timer: {
            duration: 10 * 60,
            message: '始まるよ',
        },
        message: 'ひと休憩',
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

    constructor(
        public readonly omu: Omu,
        public readonly obs: OBSPlugin,
    ) {
        this.config = omu.registries.get(BREAK_TIMER_CONFIG_REGISTRY_TYPE).compatSvelte();
        this.state = omu.registries.get(BREAK_TIMER_STATE_REGISTRY_TYPE).compatSvelte();
    }

    public async reset(): Promise<void> {
        this.state.set({ type: 'work' });
    }

    public async start(): Promise<void> {
        const scene = await this.obs.sceneGetCurrent();
        this.state.set({ type: 'break', start: Date.now(), scene: scene?.name || null });
        const config = get(this.config);
        if (!config.switch.scene) return;
        this.obs.sceneSetCurrentByName(config.switch.scene);
    }

    public async resetConfig(): Promise<void> {
        this.config.set(BREAK_TIMER_CONFIG_REGISTRY_TYPE.defaultValue);
    }
}
