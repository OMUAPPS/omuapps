import { AABB2 } from '$lib/math/aabb2';
import { Vec2 } from '$lib/math/vec2';
import { PALETTE_RGB } from '../../colors';
import type { Game } from '../../core/game';
import { DEFAULT_TRANSFORM } from '../../core/transform';
import { type Item, type ItemPool, type PoolOptions } from '../../item/item';
import client_background from '../../resources/client_background.png';
import client_kitchen from '../../resources/client_kitchen.png';
import type { SceneHandler } from '../scene';
import ScreenCreator from './ScreenFactory.svelte';

export interface SceneFactoryData {
    type: 'factory';
    item?: Item;
}

export class SceneFactory implements SceneHandler<SceneFactoryData> {
    public readonly component = ScreenCreator;
    private readonly pool: ItemPool;

    constructor(
        private readonly game: Game,
    ) {
        this.pool = game.states.factory.value;
    }

    async handle(scene: SceneFactoryData) {
        const { draw, matrices, input } = this.game.pipeline;
        if (this.game.side === 'client') {
            const texBackground = (await this.game.assetManager.getTextureByUrl(client_background).promise).unwrap.texture;
            const texKitchen = (await this.game.assetManager.getTextureByUrl(client_kitchen).promise).unwrap.texture;
            draw.texture(0, 0, matrices.width, matrices.height, texBackground);
            draw.texture(0, 0, matrices.width, matrices.height, texKitchen);
            draw.rectangle(0, 0, matrices.width, matrices.height, PALETTE_RGB.BACKGROUND.with({ w: 0.3 }));
        }
        let item: Item | undefined = scene.item && this.game.states.items.get(scene.item.id);
        if (!scene.item) {
            item = scene.item = this.game.itemSystem.allocateItem({
                attrs: {
                    image: this.game.itemSystem.attributeRegistry.image.create(),
                    dragging: this.game.itemSystem.attributeRegistry.dragging.create(),
                },
                children: [],
                transform: DEFAULT_TRANSFORM,
                pool: 'factory',
            });
            this.pool.items[item.id] = { id: scene.item.id };
        }
        if (JSON.stringify(item!) !== JSON.stringify(scene.item)) {
            Object.assign(item!, scene.item);
        }
        const bounds = new AABB2(Vec2.ZERO, new Vec2(matrices.width, matrices.height));
        draw.rectangle(...bounds.toArray(), PALETTE_RGB.ACCENT.with({ w: 0.5 }));
        const center = new Vec2(bounds.width / 2, bounds.height / 2);
        this.pool.bounds = bounds.offset(center.scale(-0.5));
        const transform = {
            right: Vec2.RIGHT,
            up: Vec2.UP,
            offset: bounds.min.add(center),
        };
        const options: PoolOptions = {
            pool: this.pool,
            transform,
        };
        this.game.itemSystem.initRenderPass();
        await this.game.itemSystem.renderPool(this.pool, options);
        const fridgePos = new Vec2(matrices.width - 300, 100);
        await this.game.fridgeSystem.render(fridgePos);
        await this.game.itemSystem.renderHeld();
        for (const event of input) {
            this.game.inputSystem.clear();
            this.game.itemSystem.initPass();
            await this.game.itemSystem.handleMouse(this.pool, options, event);
            await this.game.fridgeSystem.handleInput(fridgePos, event);
            this.game.itemSystem.endInput();
            await this.game.inputSystem.handle(event);
        }
    }
}
