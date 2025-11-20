import { Serializer, type Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/api/registry';
import type { AlignType } from '@omujs/ui';
import type { Writable } from 'svelte/store';
import { APP_ID } from './app.js';

export type TimerData = {
    startTime: number;
    stopTime: number;
    time: number;
    running: boolean;
};

export type TimerConfig = {
    version: number;
    format: string;
    style: {
        color: string;
        backgroundColor: string;
        backgroundOpacity: number;
        backgroundPadding: [number, number];
        fontSize: number;
        fontFamily: string;
        align: {
            x: AlignType;
            y: AlignType;
        };
    };
};

const TIMER_REGISTRY_TYPE = RegistryType.createJson<TimerData>(APP_ID, {
    name: 'timer',
    defaultValue: {
        startTime: 0,
        stopTime: 0,
        time: 0,
        running: false,
    },
});

const TIMER_CONFIG_REGISTRY_TYPE = RegistryType.createJson<TimerConfig>(APP_ID, {
    name: 'timer-config',
    defaultValue: {
        version: 1,
        format: '{minutes}:{seconds}.{centiseconds}',
        style: {
            color: '#ffffff',
            backgroundColor: '#000000',
            backgroundOpacity: 1.0,
            backgroundPadding: [10, 40],
            fontSize: 100,
            fontFamily: 'Noto Sans JP',
            align: {
                x: 'middle',
                y: 'middle',
            },
        },
    },
    serializer: Serializer.transform<TimerConfig>((config) => {
        if (!config.version) {
            config.version = 1;
            config.style.align = {
                x: 'middle',
                y: 'middle',
            };
        }
        return config;
    }),
});

export class TimerApp {
    public readonly data: Writable<TimerData>;
    public readonly config: Writable<TimerConfig>;

    constructor(omu: Omu) {
        this.data = omu.registries.get(TIMER_REGISTRY_TYPE).compatSvelte();
        this.config = omu.registries.get(TIMER_CONFIG_REGISTRY_TYPE).compatSvelte();
    }

    public toggle() {
        this.data.update((data) => {
            const currentTime = Date.now();
            if (data.running) {
                return {
                    ...data,
                    stopTime: currentTime,
                    running: false,
                    time: data.time + currentTime - data.startTime,
                };
            } else {
                return { ...data, startTime: currentTime, running: true };
            }
        });
    }

    public reset() {
        this.data.update((data) => {
            const currentTime = Date.now();
            return {
                ...data,
                startTime: currentTime,
                stopTime: currentTime,
                time: 0,
            };
        });
    }
}
