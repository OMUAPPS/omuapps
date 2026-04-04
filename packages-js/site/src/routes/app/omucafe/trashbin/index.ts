import type { InputEvent } from '$lib/components/canvas/pipeline';
import { AABB2 } from '$lib/math/aabb2';
import { Vec2 } from '$lib/math/vec2';
import type { Game } from '../core/game';
import { DEFAULT_TRANSFORM } from '../core/transform';
import type { ItemPool, PoolOptions } from '../item/item';
import trashbin from './img/trashbin.png';

export class Trashbin {
    private bounds: AABB2 = AABB2.ZEROONE;
    private pool: ItemPool = { id: 'trashbin', items: {} };
    private options: PoolOptions = {
        pool: this.pool,
        bounds: AABB2.ZEROONE,
        transform: DEFAULT_TRANSFORM,
        align: Vec2.CENTER,
    };

    constructor(private readonly game: Game) {}

    public async render(pos: Vec2) {
        const { draw } = this.game.pipeline;
        const { texture: binTex } = (await this.game.asset.getTextureByUrl(trashbin).promise).unwrap;
        this.bounds = new AABB2(
            pos.sub({ x: binTex.width, y: binTex.height }),
            pos,
        );
        draw.texture(...this.bounds.toArray(), binTex);
        this.options = {
            bounds: this.bounds,
            transform: DEFAULT_TRANSFORM,
            pool: this.pool,
            align: Vec2.CENTER,
        };
        await this.game.itemRenderer.renderPool(this.pool, this.options);
        for (const key in this.pool.items) {
            this.game.item.items.delete(key);
        }
        this.pool.items = {};
    }

    public async handleInput(event: InputEvent) {
        this.game.item.handleMouse(this.pool, this.options, event);
    }
}
