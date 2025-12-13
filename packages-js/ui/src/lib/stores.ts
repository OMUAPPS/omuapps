import type { Chat } from '@omujs/chat';
import type { OBSPlugin } from '@omujs/obs';
import { Omu } from '@omujs/omu';
import { BROWSER } from 'esm-env';
import type { Snippet } from 'svelte';
import { type Writable, writable } from 'svelte/store';

type TranslateFunction = (key: string, options?: Record<string, string>) => string;

export const translate: Writable<TranslateFunction> = writable(
    (key: string, options?: Record<string, unknown>) => {
        return `(translation for ${key} not found. options: ${JSON.stringify(options)})`;
    },
);

export const omu: Writable<Omu> = writable();
export const chat: Writable<Chat> = writable();
export const obs: Writable<OBSPlugin> = writable();

export function setGlobal(values: {
    omu?: Omu;
    chat?: Chat;
    obs?: OBSPlugin;
}) {
    if (values.omu) {
        omu.set(values.omu);
    }
    if (values.chat) {
        chat.set(values.chat);
    }
    if (values.obs) {
        obs.set(values.obs);
    }
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

export type LinkHandler = (href: string) => boolean;
export const linkOpenHandler = writable<LinkHandler | undefined>(undefined);

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

export interface TooltipEntry {
    id: number;
    render: Snippet<[]>;
    element: HTMLElement;
};

export const tooltipStack = writable<TooltipEntry[]>([]);
export let tooltipId = 0;

export function getTooltipId() {
    return tooltipId++;
}

export function tooltipAdd(entry: TooltipEntry) {
    tooltipStack.update((value) => {
        value = value.filter((item) => item.id !== entry.id);
        value.push(entry);
        return value;
    });
}

export function tooltipRemove(entry: TooltipEntry) {
    tooltipStack.update((value) => {
        return value.filter((item) => item.id !== entry.id);
    });
}

export interface PopupEntry {
    id: number;
    render: Snippet<[]>;
    element: HTMLElement;
    content?: HTMLElement;
};

export const popupStack = writable<PopupEntry[]>([]);
export let popupId = 0;

export function getPopupId() {
    return popupId++;
}

export function popupAdd(entry: PopupEntry) {
    popupStack.update((value) => {
        value = value.filter((item) => item.id !== entry.id);
        value.push(entry);
        return value;
    });
}

export function popupRemove(entry: PopupEntry) {
    popupStack.update((value) => {
        return value.filter((item) => item.id !== entry.id);
    });
}
