import { createI18n, createI18nUnion, I18nKeys, loadI18n, type I18nRaw, type TranslateFunctionRaw } from './i18n';

export { createI18n, createI18nUnion, I18nRaw, TranslateFunctionRaw };

import enUS from '../locales/en-US.json';
import jaJP from '../locales/ja-JP.json';

export type LocaleCode = 'ja-JP' | 'en-US';

export type Keys = I18nKeys<typeof jaJP>;

export type I18n = I18nRaw<Keys>;
export type TranslateFunction = TranslateFunctionRaw<Keys>;

interface LocaleEntry<T extends string = string> {
    name: string;
    code: string;
    alias: string[];
    i18n: I18nRaw<T>;
};

export const LOCALES: Record<LocaleCode, LocaleEntry<Keys>> = {
    'ja-JP': {
        name: '日本語',
        code: 'ja-JP',
        alias: ['ja-JP', 'ja'],
        i18n: loadI18n(jaJP, 'ja-JP'),
    },
    'en-US': {
        name: 'English',
        code: 'en-US',
        alias: ['en-US', 'en'],
        i18n: loadI18n(enUS, 'en-US'),
    },
};

export const SYSTEM_LANGUAGE: LocaleCode = getSystemLanguage();

function getSystemLanguage(): LocaleCode {
    if (typeof window === 'undefined') {
        return 'ja-JP';
    }
    for (const lang of window.navigator.languages) {
        for (const [key, { alias }] of Object.entries(LOCALES)) {
            if (alias.includes(lang)) {
                return key as LocaleCode;
            }
        }
    }
    return 'ja-JP';
}

const i18nSubscribers: Subscriber<I18nRaw<Keys>>[] = [];

export const i18n: Writable<I18nRaw<Keys>> = {
    value: LOCALES[SYSTEM_LANGUAGE].i18n,
    subscribe(run: Subscriber<I18nRaw<Keys>>): Unsubscriber {
        i18nSubscribers.push(run);
        run(i18n.value);
        return () => {
            const index = i18nSubscribers.indexOf(run);
            if (index !== -1) {
                i18nSubscribers.splice(index, 1);
            }
        };
    },
    set(newI18n: I18nRaw<Keys>): void {
        i18n.value = newI18n;
        for (const subscriber of i18nSubscribers) {
            subscriber(newI18n);
        }
    },
    update(updater: Updater<I18nRaw<Keys>>): void {
        i18n.value = updater(i18n.value);
        for (const subscriber of i18nSubscribers) {
            subscriber(i18n.value);
        }
    },
};

type Subscriber<T> = (value: T) => void;

type Unsubscriber = () => void;

type Updater<T> = (value: T) => T;

export interface Readable<T> {
    value: T;
    subscribe(this: void, run: Subscriber<T>): Unsubscriber;
}

export interface Writable<T> extends Readable<T> {
    set(this: void, value: T): void;
    update(this: void, updater: Updater<T>): void;
}
