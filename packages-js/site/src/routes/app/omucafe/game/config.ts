import { Serializer } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/api/registry';
import { APP_ID } from '../app.js';

export const DEFAULT_CONFIG = {
    version: 3,
    obs: {
        scene_uuid: null as string | null,
        background_uuid: null as string | null,
        overlay_uuid: null as string | null,
    },
    scenes: {
        product_list: {
            scroll: 0,
            search: '',
        }
    },
    audio: {
        volumes: {
            master: 1,
            effects: 1,
        }
    },
    chat: {
        show: true,
    }
};

export type Config = typeof DEFAULT_CONFIG;

function migrate(config: Config): Config {
    if (config.version === 1) {
        config.audio = {
            volumes: {
                master: 1,
                effects: 1,
            },
        };
        config.version = 2;
    }
    if (config.version === 2) {
        config.chat = {
            show: true,
        }
        config.version = 3;
    }
    return config;
}

export const APP_CONFIG_REGISTRY_TYPE = RegistryType.createJson<Config>(APP_ID, {
    name: 'config',
    defaultValue: DEFAULT_CONFIG,
    serializer: Serializer
        .transform<Config>(migrate)
        .fallback(DEFAULT_CONFIG),
});
