import type { GameConfig, Scene, States } from '../omucafe-app.js';
import type { PlayingAudioClip } from './audioclip.js';
import type { ItemState } from './item-state.js';

export type Kitchen = {
    audios: Record<string, PlayingAudioClip>,
    items: Record<string, ItemState>,
    held: string | null,
    hovering: string | null,
    mouse: { x: number, y: number },
};

export type KitchenContext = {
    audios: Record<string, PlayingAudioClip>,
    items: Record<string, ItemState>,
    held: string | null,
    hovering: string | null,
    mouse: { x: number, y: number },
    side: 'client' | 'background' | 'overlay',
    config: GameConfig,
    scene: Scene,
    states: States,
};
