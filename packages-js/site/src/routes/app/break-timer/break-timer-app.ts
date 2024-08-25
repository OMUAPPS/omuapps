import { makeRegistryWritable } from '$lib/helper.js';
import type { OBSPlugin } from '@omujs/obs';
import { Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/extension/registry/registry.js';
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
    private task: NodeJS.Timeout | null = null;

    constructor(
        public readonly omu: Omu,
        public readonly obs: OBSPlugin,
    ) {
        this.config = makeRegistryWritable(omu.registry.get(BREAK_TIMER_CONFIG_REGISTRY_TYPE));
        this.state = makeRegistryWritable(omu.registry.get(BREAK_TIMER_STATE_REGISTRY_TYPE));
        this.state.subscribe((state) => this.update(state));
    }

    private update(state: BreakTimerState): void {
        const config = get(this.config);
        if (state.type === 'break') {
            const { scene } = state;
            if (!scene) return;
            if (this.task) clearTimeout(this.task);
            this.task = setTimeout(() => {
                this.obs.sceneSetCurrentByName(scene);
                this.state.set({ type: 'work' });
            }, config.timer.duration * 1000);
        }
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
