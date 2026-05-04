import type { InputEvent } from '$lib/components/canvas/pipeline';
import { AABB2 } from '$lib/math/aabb2';
import { clamp, lerp } from '$lib/math/math';
import { Transform2D } from '$lib/math/transform2d';
import { Vec2 } from '$lib/math/vec2';
import type { Game } from '../core/game';
import { CLIENT_WORLD_BOUNDS } from '../core/game-renderer';
import type { ItemPool, PoolOptions } from '../item/item';
import fridge_bottom from './img/fridge_bottom.png';
import fridge_step from './img/fridge_step.png';
import fridge_top from './img/fridge_top.png';

export class FridgeSystem {
    public width = 620 * 1.75;
    public offsetX = 0;
    public scroll = 0;
    public hovered = false;
    public bounds = new AABB2(Vec2.ZERO, new Vec2(this.width, 1080 * 7));

    constructor(
        private readonly game: Game,
    ) {
    }

    get pool(): ItemPool {
        return this.game.states.fridge.value;
    }

    public async render() {
        const { matrices, draw, input } = this.game.pipeline;
        const transform = new Transform2D([
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            new Vec2(CLIENT_WORLD_BOUNDS.max.x - this.offsetX, CLIENT_WORLD_BOUNDS.min.y - this.scroll),
        ]);
        const scale = 1.75;
        const renderBounds = transform.getMat4().transformAABB2(this.bounds);
        if (input.mouse.entered) {
            this.hovered = renderBounds.contains(matrices.getViewToWorld().transform2(input.mouse.pos));
        }
        const { texture: fridgeTop } = (await this.game.asset.getTextureByUrl(fridge_top).promise).unwrap;
        const { texture: fridgeStep } = (await this.game.asset.getTextureByUrl(fridge_step).promise).unwrap;
        const { texture: fridgeBottom } = (await this.game.asset.getTextureByUrl(fridge_bottom).promise).unwrap;
        let offsetY = CLIENT_WORLD_BOUNDS.min.y - this.scroll + 100;
        draw.texture(renderBounds.min.x, offsetY, renderBounds.max.x, offsetY += fridgeTop.height * scale, fridgeTop);
        for (let index = 0; index < 16; index++) {
            draw.texture(renderBounds.min.x, offsetY, renderBounds.max.x, offsetY += fridgeStep.height * scale, fridgeStep);
        }
        draw.texture(renderBounds.min.x, offsetY, renderBounds.max.x, offsetY += fridgeBottom.height * scale, fridgeBottom);
        this.offsetX = lerp(this.offsetX, this.hovered ? this.width : this.width / 4, 0.5);

        this.pool.id = 'fridge';
        const options: PoolOptions = {
            pool: this.pool,
            name: '冷蔵庫',
            transform: transform.toJSON(),
            bounds: this.bounds,
            align: Vec2.CENTER,
            ordering: 'latest',
        };
        await this.game.itemRenderer.renderPool(this.pool, options);
    }

    public async handleInput(event: InputEvent) {
        const transform = new Transform2D([
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            new Vec2(CLIENT_WORLD_BOUNDS.max.x - this.offsetX, CLIENT_WORLD_BOUNDS.min.y - this.scroll),
        ]);
        const options: PoolOptions = {
            pool: this.pool,
            name: '冷蔵庫',
            transform: transform.toJSON(),
            bounds: this.bounds,
            align: Vec2.CENTER,
            ordering: 'latest',
        };
        if (event.kind === 'mouse-wheel' && this.hovered) {
            if (event.mouse.entered) {
                this.scroll = clamp(this.scroll + event.delta, 0, this.bounds.height - CLIENT_WORLD_BOUNDS.max.y * 2);
            }
        }
        await this.game.item.handleMouse(this.pool, options, event);
    }
}
