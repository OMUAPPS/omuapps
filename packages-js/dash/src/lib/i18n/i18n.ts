import type { I18n } from '@omujs/i18n';
import { loadI18n } from '@omujs/i18n';

type ILocale = Record<
    string,
    {
        name: string;
        code: string;
        alias: string[];
        load: () => Promise<I18n>;
    }
>;

export const LOCALES = {
    'ja-JP': {
        'name': '日本語',
        'code': 'ja-JP',
        'alias': ['ja-JP', 'ja'],
        load: () => loadI18n(() => import('./locales/ja-JP.json'), 'ja-JP'),
    },
    'en-US': {
        'name': 'English',
        'code': 'en-US',
        'alias': ['en-US', 'en'],
        load: () => loadI18n(() => import('./locales/en-US.json'), 'en-US'),
    },
} satisfies ILocale;

export const DEFAULT_LOCALE = 'ja-JP';
