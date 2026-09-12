import type { InputEvent } from '$lib/components/canvas/pipeline';
import { AABB2 } from '$lib/math/aabb2';
import { clamp, lerp } from '$lib/math/math';
import { Transform2D } from '$lib/math/transform2d';
import { Vec2 } from '$lib/math/vec2';
import { PALETTE_RGB } from '../colors';
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

        // Keep the scroll hints fixed to the visible fridge, not to its shelves.
        const viewport = this.game.renderer.bounds;
        const pixel = 1 / this.game.renderer.scale;
        const left = Math.max(renderBounds.min.x, viewport.min.x);
        const right = Math.min(renderBounds.max.x, viewport.max.x);
        const top = viewport.min.y + 16 * pixel;
        const bottom = viewport.max.y - 64 * pixel;
        const maxScroll = this.bounds.height - CLIENT_WORLD_BOUNDS.height;
        if (maxScroll <= 0 || right - left < 48 * pixel || bottom <= top) return;

        const fadeHeight = Math.min(64 * pixel, viewport.height / 4);
        const shade = PALETTE_RGB.TOOLTIP_BG.with({ w: 0.25 });
        const transparent = shade.with({ w: 0 });
        if (this.scroll > 0) {
            draw.rectangleGradient2(left, viewport.min.y, right, viewport.min.y + fadeHeight, shade, transparent, Vec2.UP);
        }
        if (this.scroll < maxScroll) {
            draw.rectangleGradient2(left, viewport.max.y - fadeHeight, right, viewport.max.y, transparent, shade, Vec2.UP);
        }

        const trackX = right - 12 * pixel;
        const trackHeight = bottom - top;
        const thumbHeight = Math.min(trackHeight, Math.max(24 * pixel, trackHeight * CLIENT_WORLD_BOUNDS.height / this.bounds.height));
        const thumbY = top + (trackHeight - thumbHeight) * clamp(this.scroll / maxScroll, 0, 1);
        draw.rectangle(trackX - 2 * pixel, top, trackX + 2 * pixel, bottom, PALETTE_RGB.TOOLTIP_BG.with({ w: 0.25 }));
        draw.rectangle(trackX - 3 * pixel, thumbY, trackX + 3 * pixel, thumbY + thumbHeight, PALETTE_RGB.ACCENT);

        const previousFont = { size: draw.fontSize, family: draw.fontFamily, weight: draw.fontWeight };
        draw.fontSize = 12 * pixel;
        draw.fontFamily = 'Noto Sans JP';
        draw.fontWeight = '600';
        try {
            const hints = [
                { text: '↑', y: top + 16 * pixel, visible: this.scroll > 0 },
                { text: this.hovered ? '↕ ホイールで上下' : '↓', y: bottom - 16 * pixel, visible: this.hovered || this.scroll < maxScroll },
            ];
            for (const hint of hints) {
                if (!hint.visible) continue;
                const width = draw.measureTextActual(hint.text).width + 20 * pixel;
                if (width > right - left - 24 * pixel) continue;
                const centerX = (left + right - 16 * pixel) / 2;
                draw.roundedRect(
                    new Vec2(centerX - width / 2, hint.y - 14 * pixel),
                    new Vec2(centerX + width / 2, hint.y + 14 * pixel),
                    6 * pixel, PALETTE_RGB.BACKGROUND,
                );
                await draw.textAlign(new Vec2(centerX, hint.y), hint.text, Vec2.CENTER, PALETTE_RGB.ACCENT);
            }
        } finally {
            draw.fontSize = previousFont.size;
            draw.fontFamily = previousFont.family;
            draw.fontWeight = previousFont.weight;
        }
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
