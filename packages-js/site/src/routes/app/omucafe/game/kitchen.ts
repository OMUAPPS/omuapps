import type { PossibleVec2 } from '$lib/math/vec2.js';
import type { GameConfig, Scene, States } from '../omucafe-app.js';
import type { PlayingAudioClip } from './audioclip.js';
import type { ItemState } from './item-state.js';

export type Kitchen = {
    audios: Record<string, PlayingAudioClip>,
    items: Record<string, ItemState>,
    held: string | null,
    hovering: string | null,
    mouse: {
        position: PossibleVec2,
        delta: PossibleVec2,
    },
};

export type KitchenContext = {
    audios: Record<string, PlayingAudioClip>,
    items: Record<string, ItemState>,
    held: string | null,
    hovering: string | null,
    mouse: {
        position: PossibleVec2,
        delta: PossibleVec2,
    },
    side: 'client' | 'background' | 'overlay',
    config: GameConfig,
    scene: Scene,
    states: States,
};
