import type { I18n } from '@omujs/i18n';
import { loadI18n } from '@omujs/i18n';
import LOCALELIST from './locales/_list.json' with { type: 'json' };

type ILocale = Record<
    string,
    {
        name: string;
        load: () => Promise<I18n>;
    }
>;

export const LOCALES: ILocale = {};

LOCALELIST.map((locale) => {
    LOCALES[locale.code] = {
        name: locale.name,
        load: () => loadI18n(() => import(`./locales/${locale.code}.json`), locale.code),
    };
});

export const DEFAULT_LOCALE = 'ja-JP';
