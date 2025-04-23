import type { Asset } from '../game/asset.js';
import { createHoldable } from '../game/behavior/holdable.js';
import { builder } from '../game/script.js';
import { DEFAULT_GAME_CONFIG, type GameConfig } from '../omucafe-app.js';
import bubble from './bubble.png';
import fries from './fries.png';
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

const { e, c, v } = builder;

export const EXAMPLE: GameConfig = {
    ...DEFAULT_GAME_CONFIG,
    items: {
        fries: {
            id: 'fries',
            name: 'Fries',
            image: asset(fries),
            behaviors: {
                holdable: createHoldable(),
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
                holdable: createHoldable(),
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
                action: {
                    on: {
                        dropChild: 'fryer_drop',
                        clickChild: 'fryer_click',
                    },
                },
            },
            bounds: {
                min: { x: 0, y: 0 },
                max: { x: 831, y: 635 },
            },
            transform: {
                right: { x: 0.7, y: 0 },
                up: { x: 0, y: 0.7 },
                offset: { x: 1300, y: 200 },
            }
        },
        tray: {
            id: 'tray',
            name: 'Tray',
            image: asset(tray),
            behaviors: {
                holdable: createHoldable(),
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
                particle: {
                    type: 'particle',
                    asset: asset(bubble),
                }
            }
        },
    },
    scripts: {
        fryer_drop: {
            name: 'Fryer Drop',
            expression: e.of('fryer_drop', [
                // effect = create_effect(held, 'fry')
                c.assign(
                    v.string('effect'),
                    c.invoke(
                        v.variable('create_effect'),
                        v.variable('held'),
                        v.string('fry')
                    )
                ),
            ]),
        },
        fryer_click: {
            name: 'Fryer Click',
            expression: e.of('fryer_click', [
                // remove_effect(held, 'fry')
                c.invoke(
                    v.variable('remove_effect'),
                    v.variable('child'),
                    v.string('fry')
                ),
            ]),
        },
        bell_click: {
            name: 'Bell Click',
            expression: e.of('bell_click', [
                c.invoke(
                    v.variable('log'),
                    v.string('Bell Clicked!'),
                ),
                c.invoke(
                    v.variable('complete'),
                    v.string('counter'),
                ),
            ]),
        }
    }
};
