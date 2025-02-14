import { makeRegistryWritable } from '$lib/helper.js';
import type { Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/extension/registry/registry.js';
import { SignalType, type Signal } from '@omujs/omu/extension/signal/signal.js';
import { BROWSER } from 'esm-env';
import type { Writable } from 'svelte/store';
import { APP_ID } from './app.js';

export type Caption = {
    readonly texts: string[];
    readonly final: boolean;
};

export const CAPTION_SIGNAL = SignalType.createJson<Caption>(APP_ID, {
    name: 'caption',
});

export type Font = {
    url: string;
    family: string;
};

export type CaptionStyle = {
    fonts: Font[];
    fontSize: number;
    fontWeight: number;
    color: string;
    backgroundColor: string;
};

export type Config = {
    lang: LanguageKey;
    style: CaptionStyle;
};

export const CONFIG_REGISTRY = RegistryType.createJson<Config>(APP_ID, {
    name: 'config',
    defaultValue: {
        lang: BROWSER ? (window.navigator.language as LanguageKey) : 'ja-JP',
        style: {
            fonts: [
                {
                    url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap',
                    family: 'Noto Sans JP',
                },
            ],
            fontSize: 24,
            fontWeight: 700,
            color: '#0B6F72',
            backgroundColor: '#FFFEFC',
        },
    },
});

export const LANGUAGES = {
    'ar-SA': 'العربية',
    'bn-BD': 'বাংলা',
    'bn-IN': 'বাংলা',
    'cs-CZ': 'Čeština',
    'da-DK': 'Dansk',
    'de-AT': 'Deutsch',
    'de-CH': 'Deutsch',
    'de-DE': 'Deutsch',
    'el-GR': 'Ελληνικά',
    'en-AU': 'English',
    'en-CA': 'English',
    'en-GB': 'English',
    'en-IE': 'English',
    'en-IN': 'English',
    'en-NZ': 'English',
    'en-US': 'English',
    'en-ZA': 'English',
    'es-AR': 'Español',
    'es-CL': 'Español',
    'es-CO': 'Español',
    'es-ES': 'Español',
    'es-MX': 'Español',
    'es-US': 'Español',
    'fi-FI': 'Suomi',
    'fr-BE': 'Français',
    'fr-CA': 'Français',
    'fr-CH': 'Français',
    'fr-FR': 'Français',
    'he-IL': 'עברית',
    'hi-IN': 'हिन्दी',
    'hu-HU': 'Magyar',
    'id-ID': 'Bahasa Indonesia',
    'it-CH': 'Italiano',
    'it-IT': 'Italiano',
    'ja-JP': '日本語',
    'ko-KR': '한국어',
    'nl-BE': 'Nederlands',
    'nl-NL': 'Nederlands',
    'no-NO': 'Norsk',
    'pl-PL': 'Polski',
    'pt-BR': 'Português',
    'pt-PT': 'Português',
    'ro-RO': 'Română',
    'ru-RU': 'Русский',
    'sk-SK': 'Slovenčina',
    'sv-SE': 'Svenska',
    'ta-IN': 'தமிழ்',
    'ta-LK': 'தமிழ்',
    'th-TH': 'ไทย',
    'tr-TR': 'Türkçe',
    'zh-CN': '中文',
    'zh-HK': '中文',
    'zh-TW': '中文',
};
export const LANGUAGES_OPTIONS = Object.fromEntries(
    Object.entries(LANGUAGES).map(([key, label]) => [
        key,
        { value: key, label: `${label} (${key})` },
    ]),
) as { [key: string]: { value: LanguageKey; label: string } };
export type LanguageKey = keyof typeof LANGUAGES;

export const FONTS = [
    'Zen Maru Gothic',
    'Darumadrop One',
    'Dela Gothic One',
    'Monomaniac One',
    'DotGothic16',
    'Mochiy Pop One',
    'Stick',
    'Hina Mincho',
    'Rampart One',
    'Reggae One',
    'Mochiy Pop P One',
    'Hachi Maru Pop',
    'Chokokutai',
    'Cherry Bomb One',
    'Slackside One',
    'Tsukimi Rounded',
    'Palette Mosaic',
    'Shizuru',
    'Rock 3D',
];

export class CaptionApp {
    private readonly listeners = new Set<(caption: Caption) => void>();
    private readonly captionSignal: Signal<Caption>;
    public readonly config: Writable<Config>;

    constructor(omu: Omu) {
        this.captionSignal = omu.signals.get(CAPTION_SIGNAL);
        this.captionSignal.listen((caption) => {
            for (const listener of this.listeners) {
                listener(caption);
            }
        });
        this.config = makeRegistryWritable(omu.registries.get(CONFIG_REGISTRY));
    }

    public setCaption(caption: Caption) {
        this.captionSignal.notify(caption);
    }

    public listen(listener: (caption: Caption) => void) {
        this.listeners.add(listener);
    }
}
