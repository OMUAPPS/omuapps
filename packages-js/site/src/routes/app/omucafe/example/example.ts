import type { Asset } from '../game/asset.js';
import { DEFAULT_CONFIG, type Config } from '../omucafe-app.js';
import fries from './fries.png';
import fry from './fry.mp3';
import fryer from './fryer.png';
import fryer_top from './fryer_top.png';
import pack from './pack.png';
import pack_top from './pack_top.png';
import tray from './tray-base.png';
import tray_top from './tray-top.png';

function asset(url: string): Asset {
    return {
        type: 'url',
        url,
    }
}

export const EXAMPLE: Config = {
    ...DEFAULT_CONFIG,
    items: {
        fries: {
            id: 'fries',
            name: 'Fries',
            image: asset(fries),
            behaviors: {
                action: {
                    on: {
                        click: {
                            type: 'fry',
                            body: 'fries',
                        },
                    },
                },
            },
            bounds: {
                min: { x: 0, y: 0 },
                max: { x: 565, y: 664 },
            },
            transform: {
                right: { x: 0.3, y: 0 },
                up: { x: 0, y: 0.3 },
                offset: { x: 0, y: 0 },
            },
        },
        pack: {
            id: 'pack',
            name: 'Pack',
            image: asset(pack),
            behaviors: {
                container: {
                    items: [],
                    overlay: asset(pack_top),
                    overlayTransform: {
                        right: { x: 1, y: 0 },
                        up: { x: 0, y: 1 },
                        offset: { x: 0, y: 90 },
                    },
                }
            },
            bounds: {
                min: { x: 0, y: 0 },
                max: { x: 562, y: 588 },
            },
            transform: {
                right: { x: 0.3, y: 0 },
                up: { x: 0, y: 0.3 },
                offset: { x: 0, y: 0 },
            },
        },
        fryer: {
            id: 'fryer',
            name: 'Fryer',
            image: asset(fryer),
            behaviors: {
                container: {
                    items: [],
                    overlay: asset(fryer_top),
                    overlayTransform: {
                        right: { x: 1, y: 0 },
                        up: { x: 0, y: 1 },
                        offset: { x: 0, y: 0 },
                    },
                },
                fixed: {
                    transform: {
                        right: { x: 0.7, y: 0 },
                        up: { x: 0, y: 0.7 },
                        offset: { x: 1300, y: 200 },
                    }
                },
            },
            bounds: {
                min: { x: 0, y: 0 },
                max: { x: 831, y: 635 },
            },
            transform: {
                right: { x: 1, y: 0 },
                up: { x: 0, y: 1 },
                offset: { x: 0, y: 0 },
            },
        },
        tray: {
            id: 'tray',
            name: 'Tray',
            image: asset(tray),
            behaviors: {
                container: {
                    items: [],
                    overlay: asset(tray_top),
                    overlayTransform: {
                        right: { x: 1, y: 0 },
                        up: { x: 0, y: 1 },
                        offset: { x: 0, y: 250 },
                    },
                }
            },
            bounds: {
                min: { x: 0, y: 0 },
                max: { x: 621, y: 275 },
            },
            transform: {
                right: { x: 1, y: 0 },
                up: { x: 0, y: 1 },
                offset: { x: 0, y: 0 },
            },
        }
    },
    effects: {
        fry: {
            id: 'fry',
            name: 'Fry',
            attributes: {
                audio: {
                    type: 'audio',
                    asset: asset(fry),
                    volume: 1.0,
                },
            }
        },
    }
};
