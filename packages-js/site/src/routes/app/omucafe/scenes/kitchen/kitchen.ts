import { Vec4 } from '$lib/math/vec4';
import type { Game } from '../../core/game';
import { TRANSFORM_ORIGIN } from '../../core/transform';
import type { SceneHandler } from '../scene';
import ScreenKitchen from './ScreenKitchen.svelte';
import beef from './beef.png';

export interface SceneKitchenData {
    type: 'kitchen';
}

export class SceneKitchen implements SceneHandler<SceneKitchenData> {
    component = ScreenKitchen;

    constructor(
        private readonly game: Game,
    ) {
        const item = this.game.itemSystem.allocateItem({
            attrs: {
                image: {
                    asset: {
                        type: 'url',
                        url: beef,
                    },
                },
            },
            transform: TRANSFORM_ORIGIN,
        });
        const kitchen = this.game.states.kitchen.value;
        kitchen.items[item.id] = { id: item.id };
    }

    async handle(scene: SceneKitchenData) {
        const { draw } = this.game.pipeline;
        const kitchen = this.game.states.kitchen.value;
        draw.rectangle(0, 0, 400, 100, Vec4.ONE);
        this.game.itemSystem.renderPool(kitchen);
    }
}
