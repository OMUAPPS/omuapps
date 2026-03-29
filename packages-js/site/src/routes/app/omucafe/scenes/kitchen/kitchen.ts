import { AABB2 } from '$lib/math/aabb2';
import { Vec2 } from '$lib/math/vec2';
import type { Game } from '../../core/game';
import { DEFAULT_TRANSFORM } from '../../core/transform';
import type { PoolOptions } from '../../item/item';
import client_background from '../../resources/client_background.png';
import client_kitchen from '../../resources/client_kitchen.png';
import type { SceneHandler } from '../scene';
import ScreenKitchen from './ScreenKitchen.svelte';
import beef from './beef.png';

export interface SceneKitchenData {
    type: 'kitchen';
}

export class SceneKitchen implements SceneHandler<SceneKitchenData> {
    public readonly component = ScreenKitchen;

    constructor(
        private readonly game: Game,
    ) {
        // this.addTestItem();
    }

    private addTestItem() {
        const item = this.game.itemSystem.allocateItem({
            attrs: {
                image: {
                    asset: {
                        type: 'url',
                        url: beef,
                    },
                },
                dragging: {
                    active: true,
                },
                container: {
                    active: true,
                },
            },
            transform: DEFAULT_TRANSFORM,
            children: [],
            pool: 'kitchen',
        });
        const kitchen = this.game.states.kitchen.value;
        kitchen.items[item.id] = { id: item.id };
    }

    async handle(scene: SceneKitchenData) {
        const { draw, input, matrices } = this.game.pipeline;
        const kitchen = this.game.states.kitchen.value;
        if (this.game.side === 'client') {
            const texBackground = (await this.game.assetManager.getTextureByUrl(client_background).promise).unwrap.texture;
            const texKitchen = (await this.game.assetManager.getTextureByUrl(client_kitchen).promise).unwrap.texture;
            draw.texture(0, 0, matrices.width, matrices.height, texBackground);
            draw.texture(0, 0, matrices.width, matrices.height, texKitchen);
        }
        const width = 1920 * 1.5;
        const height = 1080 * 1.5;
        const bounds = new AABB2(new Vec2(0, matrices.height / 2), new Vec2(width, matrices.height));
        kitchen.bounds = bounds;
        const scale = Math.min(matrices.width / width, matrices.height / height);
        const KITCHEN_OPTIONS: PoolOptions = {
            transform: {
                right: Vec2.RIGHT.scale(scale),
                up: Vec2.UP.scale(scale),
                offset: Vec2.ZERO,
            },
            pool: kitchen,
        };
        this.game.itemSystem.initRenderPass();
        await this.game.itemSystem.renderPool(kitchen, KITCHEN_OPTIONS);
        for (const event of input) {
            this.game.inputSystem.clear();
            this.game.itemSystem.initPass();
            await this.game.itemSystem.handleMouse(kitchen, KITCHEN_OPTIONS, event);
            this.game.itemSystem.endInput();
            await this.game.inputSystem.handle(event);
        }
    }
}
