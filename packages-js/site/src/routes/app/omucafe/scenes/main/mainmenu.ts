import type { Game } from '../../core/game';
import type { SceneHandler } from '../scene';
import ScreenMainMenu from './ScreenMainMenu.svelte';

export interface SceneMainMenuData {
    type: 'main_menu';
    task?: {
        type: 'omucafe' | 'avatar' | 'overlay' | 'setup' | 'obs_waiting';
    };
}

export class SceneMainMenu implements SceneHandler<SceneMainMenuData> {
    component = ScreenMainMenu;

    constructor(
        private readonly game: Game,
    ) {}

    async handle(scene: SceneMainMenuData) {
    }
}
