import { AABB2 } from '$lib/math/aabb2';
import { Axis } from '$lib/math/axis';
import { Vec2 } from '$lib/math/vec2';
import { PALETTE_RGB } from '../../colors';
import type { Game } from '../../core/game';
import { DEFAULT_TRANSFORM } from '../../core/transform';
import type { SceneHandler } from '../scene';
import ScreenPhoto from './ScreenPhoto.svelte';
import photo_frame from './img/photo_frame.png';

export interface ScenePhotoData {
    type: 'photo';
}

export class ScenePhoto implements SceneHandler<ScenePhotoData> {
    public readonly component = ScreenPhoto;

    constructor(private readonly game: Game) {
    }

    /**
     * メインハンドラ
     */
    async handle(scene: ScenePhotoData) {
        await this.renderScene(scene);
        await this.processInput();
    }

    /**
     * 描画処理 (Client / Overlay 共通)
     */
    private async renderScene(scene: ScenePhotoData) {
        const { draw, matrices } = this.game.pipeline;
        const { renderer, itemRenderer } = this.game;
        draw.rectangle(0, 0, 200, 200, PALETTE_RGB.ACCENT);

        const { texture } = (await this.game.asset.getTextureByUrl(photo_frame).promise).unwrap;
        const container = renderer.bounds.shrink({ x: 200, y: 200 });
        const frameBounds = container.fit(texture.size).setAt(Vec2.ZERO, container.size.scale(-0.5));
        const bounds = renderer.fitBounds;
        matrices.model.push();
        matrices.model.rotate(Axis.Z_POS.rotateDeg(3));
        draw.texture(
            ...frameBounds.toArray(),
            texture,
        );
        matrices.model.pop();

        const { kitchen } = this.game.states;
        const { resolution } = this.game.renderer;
        const options = {
            pool: kitchen.value,
            transform: DEFAULT_TRANSFORM,
            bounds: new AABB2(
                new Vec2(-resolution.x / 2, 0),
                new Vec2(resolution.x / 2, resolution.y),
            ),
            align: Vec2.UP,
        };
        itemRenderer.initPass();
        await itemRenderer.renderPool(kitchen.value, options);
        await itemRenderer.renderHeld();
    }

    /**
     * 入力処理 (Client / Overlay 共通)
     */
    private async processInput() {
        const { input: eventPipeline } = this.game.pipeline;
        const { input, item } = this.game;

        for (const event of eventPipeline) {
            input.clear();
            item.initPass();

            item.endInput();

            await input.handle(event);
        }
    }
}
