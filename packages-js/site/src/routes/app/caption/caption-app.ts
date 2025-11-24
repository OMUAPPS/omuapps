import type { Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/api/registry';
import { SignalType } from '@omujs/omu/api/signal';
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
    style: CaptionStyle;
};

export const CONFIG_REGISTRY = RegistryType.createJson<Config>(APP_ID, {
    name: 'config',
    defaultValue: {
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
    public readonly config: Writable<Config>;

    constructor(public readonly omu: Omu) {
        this.config = omu.registries.get(CONFIG_REGISTRY).compatSvelte();
    }
}
