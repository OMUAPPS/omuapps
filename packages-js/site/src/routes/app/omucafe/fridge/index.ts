import type { InputEvent } from '$lib/components/canvas/pipeline';
import { AABB2 } from '$lib/math/aabb2';
import { Vec2 } from '$lib/math/vec2';
import { PALETTE_RGB } from '../colors';
import type { Game } from '../core/game';
import type { ItemPool, PoolOptions } from '../item/item';

export class FridgeSystem {
    private pool: ItemPool;
    public width = 1920 / 4;

    constructor(
        private readonly game: Game,
    ) {
        this.pool = game.states.fridge.value;
    }

    public async render(pos: Vec2) {
        const { draw } = this.game.pipeline;
        const renderBounds = new AABB2(pos, pos.add({ x: this.width, y: 1080 }));
        draw.rectangle(...renderBounds.toArray(), PALETTE_RGB.BACKGROUND);
        const localBounds = new AABB2(Vec2.ZERO, new Vec2(this.width, 1080));
        this.pool.bounds = localBounds;
        this.pool.id = 'fridge';
        const options: PoolOptions = {
            pool: this.pool,
            transform: {
                right: Vec2.RIGHT,
                up: Vec2.UP,
                offset: new Vec2(pos.x, pos.y),
            },
        };
        await this.game.itemSystem.renderPool(this.pool, options);
    }

    public async handleInput(pos: Vec2, event: InputEvent) {
        const options: PoolOptions = {
            pool: this.pool,
            transform: {
                right: Vec2.RIGHT,
                up: Vec2.UP,
                offset: new Vec2(pos.x, pos.y),
            },
        };
        await this.game.itemSystem.handleMouse(this.pool, options, event);
    }
}
