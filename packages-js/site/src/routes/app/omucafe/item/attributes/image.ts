import { AABB2 } from '$lib/math/aabb2';
import { Vec2 } from '$lib/math/vec2';
import type { Asset } from '../../core/asset';
import type { Game } from '../../core/game';
import placeholder from '../../resources/img/placeholder.png';
import type { AttributeHandler, AttributeInvoke, ItemMouseEvent, ItemRender, LoadContext } from '../attribute-handler';
import type { ItemPool } from '../item';
import ImageEditor from './ImageEditor.svelte';

export interface AttrImage {
    asset: Asset;
}

export class AttributeImage implements AttributeHandler<AttrImage> {
    name = '画像';
    editor = ImageEditor;

    constructor(
        private readonly game: Game,
    ) {}

    create(): AttrImage {
        return {
            asset: {
                type: 'url',
                url: placeholder,
            },
        };
    }

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

    async collide({ item, attr }: AttributeInvoke<AttrImage>, pool: ItemPool, event: ItemMouseEvent, ctx: { hovered?: string }) {
        const { asset } = attr;
        const textureResult = this.game.assetManager.getTexture(asset);
        const { states } = this.game.itemSystem;

        if (event.kind !== 'mouse-move') return;
        if (textureResult.type !== 'ready') return;
        if (states.held === item.id) return;

        const { texture, data } = textureResult.data;

        if (
            event.offset.x < -texture.width / 2 ||
            event.offset.y < -texture.height / 2 ||
            event.offset.x > texture.width / 2 ||
            event.offset.y > texture.height / 2
        ) {
            return;
        }
        const x = Math.floor(event.offset.x + texture.width / 2);
        const y = Math.floor(event.offset.y + texture.height / 2);
        const index = (y * texture.width + x) * 4;
        const alpha = data.data[index + 3];
        if (alpha < 128) return; // Hit transparent pixel, treat as miss

        ctx.hovered = item.id;
    }

    async bounds({ attr }: AttributeInvoke<AttrImage>, result: { render: AABB2 }): Promise<void> {
        const { asset } = attr;
        const texture = this.game.assetManager.getTexture(asset);
        if (texture.type !== 'ready') throw new Error('Asset not ready');
        const { width, height } = texture.data.texture;
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
            const { width, height } = texture.data.texture;
            draw.texture(-width / 2, -height / 2, width / 2, height / 2, texture.data.texture);
        });
    }
}
