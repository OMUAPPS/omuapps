import { loadI18n } from '@omujs/i18n';

export const LOCALES = {
    'ja-JP': {
        name: '日本語',
        load: () => loadI18n(() => import('./locales/ja-JP.json'), 'ja-JP'),
    },
};

export const DEFAULT_LOCALE = 'ja-JP';
