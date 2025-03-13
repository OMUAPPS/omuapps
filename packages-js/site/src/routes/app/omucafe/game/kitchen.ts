import type { Config, Scene, States } from '../omucafe-app.js';
import type { ItemState } from './item-state.js';

export type Kitchen = {
    items: Record<string, ItemState>,
    held: string | null,
    hovering: string | null,
    mouse: { x: number, y: number },
};

export type KitchenContext = {
    items: Record<string, ItemState>,
    held: string | null,
    hovering: string | null,
    mouse: { x: number, y: number },
    side: 'client' | 'background' | 'overlay',
    getConfig(): Config,
    setConfig(config: Config): void,
    getScene(): Scene,
    setScene(scene: Scene): void,
    getStates(): States,
    setStates(states: States): void,
};
