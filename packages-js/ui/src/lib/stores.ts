import type { Chat } from '@omujs/chat';
import { App, Omu } from '@omujs/omu';
import type { Locale } from '@omujs/omu/localization';
import { BROWSER } from 'esm-env';
import { type Writable, writable } from 'svelte/store';

type TranslateFunction = (key: string, options?: Record<string, string>) => string;

export const translate: Writable<TranslateFunction> = writable(
    (key: string, options?: Record<string, unknown>) => {
        return `(translation for ${key} not found. options: ${JSON.stringify(options)})`;
    },
);

export const client: Writable<Omu> = writable();
export const chat: Writable<Chat> = writable();
export function setClient(newClient: Omu): Omu {
    if (!BROWSER) {
        const DUMMY_CLIENT = new Omu(new App('com.omuapps:dummy', { version: '0.0.0' }));
        const newClient = DUMMY_CLIENT;
        client.set(newClient);
        return newClient;
    };
    client.update((oldClient) => {
        if (oldClient) {
            // throw new Error('Client already set');
            console.warn('HMR detected. reloading...');
            window.location.reload();
            return oldClient;
        }
        return newClient;
    });
    newClient.i18n.defaultLocales = window.navigator.languages as Locale[];
    return newClient;
}
export function setChat<T extends Chat>(newChat: T): T {
    chat.set(newChat);
    return newChat;
}

export type Color = {
    r: number;
    g: number;
    b: number;
    a?: number;
};
export type Theme = {
    [key: string]: Color | number;
};

export const theme: Writable<Theme> = writable({
    'color-bg-1': { r: 246, g: 242, b: 235 },
    'color-bg-2': { r: 255, g: 254, b: 252 },
    'color-1': { r: 11, g: 111, b: 114 },
    'color-2': { r: 53, g: 223, b: 225 },
    'color-text': { r: 68, g: 68, b: 68 },
    'color-outline': { r: 0, g: 0, b: 0, a: 0.1 },
    margin: 10,
});
export const dateTimeFormats = writable<{
    full: Intl.DateTimeFormat;
    short: Intl.DateTimeFormat;
    time: Intl.DateTimeFormat;
}>();

if (BROWSER) {
    dateTimeFormats.set({
        full: new Intl.DateTimeFormat(window.navigator.language, {
            dateStyle: 'full',
            timeStyle: 'long',
            hour12: false,
        }),
        short: new Intl.DateTimeFormat(window.navigator.language, {
            dateStyle: 'short',
            timeStyle: 'short',
            hour12: false,
        }),
        time: new Intl.DateTimeFormat(window.navigator.language, {
            timeStyle: 'short',
            hour12: false,
        }),
    });
}
