import type { models } from '@omujs/chat';
import type { NetworkStatus } from '@omujs/omu/network';
import type { Update } from '@tauri-apps/plugin-updater';
import { writable } from 'svelte/store';

export const lock = {
    loaded: false,
};

export type AddChannelStatus = {
    type: 'idle';
} | {
    type: 'searching';
} | {
    type: 'result';
    channels: {
        channel: models.Channel;
        added: boolean;
    }[];
};

type AppState = {
    type: 'initializing';
} | {
    type: 'checking_update';
} | {
    type: 'agreements';
    accept: () => void;
} | {
    type: 'starting';
} | {
    type: 'setup';
} | {
    type: 'connecting';
} | {
    type: 'add_channels';
    state: AddChannelStatus;
    resolve: () => void;
} | {
    type: 'update';
    update: Update;
    resolve: () => void;
} | {
    type: 'restore';
} | {
    type: 'ready';
};

export const state = writable<AppState>({ type: 'initializing' });
export const netState = writable<NetworkStatus | undefined>();
