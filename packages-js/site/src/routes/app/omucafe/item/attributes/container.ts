import { AABB2 } from '$lib/math/aabb2';
import { Vec2 } from '$lib/math/vec2';
import type { Asset } from '../../core/asset';
import type { Game } from '../../core/game';
import type { Action } from '../../core/input-system';
import { getTransform, type Transform } from '../../core/transform';
import type { AttributeHandler, AttributeInvoke, ItemMouseEvent, ItemRender, LoadContext } from '../attribute-handler';
import type { ItemPool } from '../item';
import ContainerEditor from './ContainerEditor.svelte';

export interface AttrContainer {
    active: boolean;
    cover?: {
        asset: Asset;
        transform: Transform;
    };
}

export class AttributeContainer implements AttributeHandler<AttrContainer> {
    name = '容器';
    editor = ContainerEditor;

    constructor(
        private readonly game: Game,
    ) {}

    create(): AttrContainer {
        return {
            active: true,
        };
    }

    async load({ attr }: AttributeInvoke<AttrContainer>, ctx: LoadContext): Promise<void> {
        const { cover } = attr;
        if (!cover) return;
        const assetState = this.game.assetManager.getTexture(cover.asset);
        if (assetState.type !== 'ready') {
            const task = ctx.create({
                title: `Loading texture: ${JSON.stringify(cover.asset)}`,
            });
            assetState.promise.then(() => {
                task.resolve();
            });
        }
    }

    async bounds({ item, attr }: AttributeInvoke<AttrContainer>, result: { render: AABB2 }, childrenRender: Record<string, ItemRender>): Promise<void> {
        for (const id of item.children) {
            const child = this.game.itemSystem.items.get(id);
            if (!child) continue;
            const transform = getTransform(child.transform).getMat4();
            const bounds = transform.transformAABB2(childrenRender[id].bounds);
            result.render = result.render.union(bounds);
        }
        const { cover } = attr;
        if (cover) {
            const texture = this.game.assetManager.getTexture(cover.asset);
            if (texture.type !== 'ready') throw new Error('Asset not ready');
            const { width, height } = texture.data.texture;
            const bounds = new AABB2(
                new Vec2(-width / 2, -height / 2),
                new Vec2(width / 2, height / 2),
            );
            const transform = getTransform(cover.transform);
            result.render = result.render.union(transform.getMat4().transformAABB2(bounds));
        }
    }

    async renderOverlay({ item, attr }: AttributeInvoke<AttrContainer>, pool: ItemPool, render: ItemRender, children: Record<string, ItemRender>): Promise<void> {
        const { draw, matrices } = this.game.pipeline;
        for (const id of item.children) {
            const child = this.game.itemSystem.items.get(id);
            if (!child) continue;
            const transform = getTransform(child.transform).getMat4();
            const bounds = transform.transformAABB2(children[id].bounds);
            // draw.rectangleStroke(bounds.min.x, bounds.min.y, bounds.max.x, bounds.max.y, Vec4.ONE, 2);
        }
        const { cover } = attr;
        if (cover) {
            const texture = this.game.assetManager.getTexture(cover.asset);
            if (texture.type !== 'ready') throw new Error('Asset not ready');
            const { width, height } = texture.data.texture;
            const bounds = new AABB2(
                new Vec2(-width / 2, -height / 2),
                new Vec2(width / 2, height / 2),
            );
            const transform = getTransform(cover.transform);
            matrices.model.scope(() => {
                matrices.model.multiply(transform.getMat4());
                draw.texture(...bounds.toArray(), texture.data.texture);
            });
        }
    }

    async renderChildren(invoke: AttributeInvoke<AttrContainer>, render: ItemRender, children: Record<string, ItemRender>): Promise<void> {
        const { draw, matrices } = this.game.pipeline;
        for (const id in children) {
            if (!Object.hasOwn(children, id)) continue;
            const child = this.game.itemSystem.items.get(id);
            if (!child) continue;
            const { texture, bounds } = children[id];

            matrices.model.push();
            matrices.model.multiply(getTransform(child.transform).getMat4());
            draw.texture(bounds.min.x, bounds.min.y, bounds.max.x, bounds.max.y, texture);
            matrices.model.pop();
        }
    }

    async actions({ item, attr }: AttributeInvoke<AttrContainer>, pool: ItemPool, event: ItemMouseEvent, ctx: { actions: Action[] }): Promise<void> {
        if (!attr.active) return;
        const { states } = this.game.itemSystem;
        if (states.held === item.id && states.hovered) {
            const container = this.game.itemSystem.items.get(states.hovered);
            if (!container) return;
            ctx.actions.push({
                title: '乗せる',
                invoke: async () => {
                    states.held = undefined;
                    this.game.itemSystem.attachItem(container, item);
                },
            });
        }
    }
}
