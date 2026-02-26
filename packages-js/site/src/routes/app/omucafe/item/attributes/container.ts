import type { AABB2 } from '$lib/math/aabb2';
import type { Game } from '../../core/game';
import type { Action } from '../../core/input-system';
import { getTransform } from '../../core/transform';
import type { AttributeHandler, AttributeInvoke, ItemMouseEvent, ItemRender, LoadContext } from '../attribute-handler';
import type { ItemPool } from '../item';

export interface AttrContainer {
    active: boolean;
}

export class AttributeContainer implements AttributeHandler<AttrContainer> {
    constructor(
        private readonly game: Game,
    ) {}

    async load(invoke: AttributeInvoke<AttrContainer>, ctx: LoadContext): Promise<void> {

    }

    async bounds({ item }: AttributeInvoke<AttrContainer>, result: { render: AABB2 }, childrenRender: Record<string, ItemRender>): Promise<void> {
        const { draw, matrices } = this.game.pipeline;
        for (const id of item.children) {
            const child = this.game.itemSystem.items.get(id);
            if (!child) continue;
            const transform = getTransform(child.transform).getMat4();
            const bounds = transform.transformAABB2(childrenRender[id].bounds);
            result.render = result.render.union(bounds);
        }
    }

    async renderOverlay({ item }: AttributeInvoke<AttrContainer>, pool: ItemPool, render: ItemRender, children: Record<string, ItemRender>): Promise<void> {
        const { draw, matrices } = this.game.pipeline;
        for (const id of item.children) {
            const child = this.game.itemSystem.items.get(id);
            if (!child) continue;
            const transform = getTransform(child.transform).getMat4();
            const bounds = transform.transformAABB2(children[id].bounds);
            // draw.rectangleStroke(bounds.min.x, bounds.min.y, bounds.max.x, bounds.max.y, Vec4.ONE, 2);
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

    async actions({ item }: AttributeInvoke<AttrContainer>, pool: ItemPool, event: ItemMouseEvent, ctx: { actions: Action[] }): Promise<void> {
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
