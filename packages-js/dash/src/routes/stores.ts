import type { Models } from '@omujs/chat';
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
        channel: Models.Channel;
        added: boolean;
    }[];
};

export type AppState = {
    type: 'initializing';
} | {
    type: 'checking_update';
} | {
    type: 'agreements';
    accept: () => void;
} | {
    type: 'starting';
} | {
    type: 'connecting';
    reject: (reason: { type: 'server_start_failed' }) => void;
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
    message?: string;
} | {
    type: 'ready';
};

export const appState = writable<AppState>({ type: 'initializing' });
export const netState = writable<NetworkStatus | undefined>();
