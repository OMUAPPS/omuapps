import { Vec4 } from '$lib/math/vec4';
import type { Game } from '../../core/game';
import type { SceneHandler } from '../scene';
import ScreenMainMenu from './ScreenMainMenu.svelte';

export interface SceneMainMenuData {
    type: 'main_menu';
}

export class SceneMainMenu implements SceneHandler<SceneMainMenuData> {
    component = ScreenMainMenu;

    constructor(
        private readonly game: Game,
    ) {}

    async handle(scene: SceneMainMenuData) {
        const { draw } = this.game.pipeline;
        draw.rectangle(0, 0, 100, 100, Vec4.ONE);
    }
}
