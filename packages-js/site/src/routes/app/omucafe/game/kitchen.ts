import type { Vec2Like } from '$lib/math/vec2.js';
import type { GameConfig, Scene, States } from '../omucafe-app.js';
import type { PlayingAudioClip } from './audioclip.js';
import type { ItemState } from './item-state.js';

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
};

export type KitchenContext = {
    audios: Record<string, PlayingAudioClip>,
    items: Record<string, ItemState>,
    held: string | null,
    hovering: string | null,
    mouse: MouseState,
    side: 'client' | 'background' | 'overlay',
    config: GameConfig,
    scene: Scene,
    states: States,
};
