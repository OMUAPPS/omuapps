import { AABB2 } from '$lib/math/aabb2';
import { Vec2 } from '$lib/math/vec2';
import type { Asset } from '../../core/asset';
import type { Game } from '../../core/game';
import type { AttributeHandler, AttributeInvoke, ItemMouseEvent, ItemRender, LoadContext } from '../attribute-handler';
import type { ItemPool } from '../item';

export interface AttrImage {
    asset: Asset;
}

export class AttributeImage implements AttributeHandler<AttrImage> {
    constructor(
        private readonly game: Game,
    ) {}

    async load({ attr }: AttributeInvoke<AttrImage>, ctx: LoadContext): Promise<void> {
        const { asset } = attr;
        const assetState = this.game.assetManager.getTexture(asset);
        if (assetState.type !== 'ready') {
            const task = ctx.create({
                title: `Loading texture: ${JSON.stringify(asset)}`,
            });
            assetState.promise.then(() => {
                task.resolve();
            });
        }
    }

    async collide({ item, attr }: AttributeInvoke<AttrImage>, pool: ItemPool, event: ItemMouseEvent) {
        const { asset } = attr;
        const texture = this.game.assetManager.getTexture(asset);
        if (texture.type !== 'ready') return;
        const { states } = this.game.itemSystem;
        if (states.held === item.id) return;
        if (event.kind === 'mouse-move') {
            if (states.hovered) return;
            const { width, height } = texture.data;
            if (
                pool &&
                    event.offset.x > -width / 2 &&
                    event.offset.y > -height / 2 &&
                    event.offset.x < width / 2 &&
                    event.offset.y < height / 2
            ) {
                states.hovered = item.id;
            }
        }
    }

    async bounds({ attr }: AttributeInvoke<AttrImage>, result: { render: AABB2 }): Promise<void> {
        const { asset } = attr;
        const texture = this.game.assetManager.getTexture(asset);
        if (texture.type !== 'ready') throw new Error('Asset not ready');
        const { width, height } = texture.data;
        const bounds = new AABB2(
            new Vec2(-width / 2, -height / 2),
            new Vec2(width / 2, height / 2),
        );
        result.render = result.render.union(bounds);
    }

    async renderPre({ attr }: AttributeInvoke<AttrImage>, render: ItemRender): Promise<void> {
        const { draw, matrices } = this.game.pipeline;
        const { asset } = attr;
        const texture = this.game.assetManager.getTexture(asset);
        if (texture.type !== 'ready') throw new Error('Asset not ready');
        matrices.model.scope(() => {
            const { width, height } = texture.data;
            draw.texture(-width / 2, -height / 2, width / 2, height / 2, texture.data);
        });
    }
}
