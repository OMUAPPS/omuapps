import { Identifier } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/extension/registry/index.js';
import { NAMESPACE } from '../origin.js';

const PLUGIN_IDENTIFIER = new Identifier(NAMESPACE, 'translator', 'plugin');

export type Language =
    | 'en'
    | 'es'
    | 'fr'
    | 'de'
    | 'it'
    | 'pt'
    | 'nl'
    | 'pl'
    | 'ru'
    | 'ja'
    | 'zh'
    | 'ko'
    | 'ar';
type TranslatorConfig = {
    active: boolean;
    languages: Language[];
};

export const CONFIG_REGISTRY_TYPE = RegistryType.createJson<TranslatorConfig>(PLUGIN_IDENTIFIER, {
    name: 'config',
    defaultValue: {
        active: false,
        languages: ['ja', 'en'],
    },
});

export const LANGUAGE_OPTIONS: { [key in Language]: { value: Language; label: string } } = {
    en: {
        value: 'en',
        label: 'English',
    },
    es: {
        value: 'es',
        label: 'Español',
    },
    fr: {
        value: 'fr',
        label: 'Français',
    },
    de: {
        value: 'de',
        label: 'Deutsch',
    },
    it: {
        value: 'it',
        label: 'Italiano',
    },
    pt: {
        value: 'pt',
        label: 'Português',
    },
    nl: {
        value: 'nl',
        label: 'Nederlands',
    },
    pl: {
        value: 'pl',
        label: 'Polski',
    },
    ru: {
        value: 'ru',
        label: 'Русский',
    },
    ja: {
        value: 'ja',
        label: '日本語',
    },
    zh: {
        value: 'zh',
        label: '中文',
    },
    ko: {
        value: 'ko',
        label: '한국어',
    },
    ar: {
        value: 'ar',
        label: 'العربية',
    },
};
