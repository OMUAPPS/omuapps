import type { Chat } from '@omujs/chat';
import { Serializer, type Omu, type SessionParam } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/api/registry';
import type { Writable } from 'svelte/store';
import { APP_ID } from './app.js';

export type Config = {
    version: number;
    hud: {
        startup: boolean;
    };
    asset: {
        type: 'default' | 'youtube';
        displayCount?: number;
        transition: {
            duration: number;
        };
        message: {
            'width'?: string;
            'height'?: string;
            'font-size'?: string;
            'line-height'?: string;
            'background'?: string;
            'color'?: string;
            'border-radius'?: string;
            'padding'?: string;
        };
        list: {
            direction?: 'newer-bottom' | 'newer-top';
            'gap'?: string;
            'flex-direction'?: 'column' | 'column-reverse';
            'background'?: string;
            'padding'?: string;
            'border-radius'?: string;
        };
        css: string;
    };
    chat: {
        filter: {
            onlyConnected: boolean;
        };
    };
};

const CONFIG_REGISTRY_TYPE = RegistryType.createJson<Config>(APP_ID, {
    name: 'config',
    defaultValue: {
        version: 1,
        hud: {
            startup: false,
        },
        asset: {
            type: 'default',
            transition: {
                duration: 200,
            },
            message: {},
            list: {},
            css: '',
        },
        chat: {
            filter: {
                onlyConnected: true,
            },
        },
    },
    serializer: Serializer.transform<Config>((config) => {
        if (config.version === 0) {
            config.version = 1;
            config.chat = {
                filter: {
                    onlyConnected: true,
                },
            };
        }
        return config;
    }),
});
const SESSION_REGISTRY_TYPE = RegistryType.createJson<SessionParam | null>(APP_ID, {
    name: 'session',
    defaultValue: null,
});

export class ChatOverlayApp {
    private static INSTANCE: ChatOverlayApp | undefined;

    public readonly config: Writable<Config>;
    public readonly session: Writable<SessionParam | null>;

    constructor(
        public readonly omu: Omu,
        public readonly chat: Chat,
    ) {
        this.config = omu.registries.get(CONFIG_REGISTRY_TYPE).compatSvelte();
        this.session = omu.registries.get(SESSION_REGISTRY_TYPE).compatSvelte();
        ChatOverlayApp.INSTANCE = this;
    }

    public static getInstance() {
        if (!ChatOverlayApp.INSTANCE) {
            throw new Error('ChatOverlayApp is not initialized');
        }
        return ChatOverlayApp.INSTANCE;
    }
}
