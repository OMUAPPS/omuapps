import type { Vec2Like } from '$lib/math/vec2.js';
import type { PlayingAudioClip } from '../asset/audioclip.js';
import type { ItemState } from '../item/item-state.js';
import type { GameConfig, States } from '../omucafe-app.js';
import type { Order } from '../order/order.js';
import type { Scene } from '../scenes/scene.js';

export type MouseState = {
    position: Vec2Like,
    delta: Vec2Like,
    over: boolean,
    ui: boolean,
}

export type Kitchen = {
    audios: Record<string, PlayingAudioClip>,
    items: Record<string, ItemState>,
    held: string | null,
    hovering: string | null,
    mouse: MouseState,
    order: Order | null,
    lastOrder: Order | null,
};

export type KitchenContext = {
    audios: Record<string, PlayingAudioClip>,
    items: Record<string, ItemState>,
    order: Order | null,
    lastOrder: Order | null,
    held: string | null,
    hovering: string | null,
    mouse: MouseState,
    side: 'client' | 'background' | 'overlay',
    config: GameConfig,
    scene: Scene,
    states: States,
};
