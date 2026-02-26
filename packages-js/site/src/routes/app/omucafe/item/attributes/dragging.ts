import { Timer } from '$lib/timer';
import { PALETTE_RGB } from '../../colors';
import type { Game } from '../../core/game';
import type { Action } from '../../core/input-system';
import type { AttributeHandler, AttributeInvoke, ItemMouseEvent, ItemRender } from '../attribute-handler';
import type { ItemPool } from '../item';

export interface AttrDragging {
    active: boolean;
    lastDrag?: number;
}

export class AttributeDragging implements AttributeHandler<AttrDragging> {
    constructor(
        private readonly game: Game,
    ) {}

    async renderOverlay({ item, attr }: AttributeInvoke<AttrDragging>, pool: ItemPool, render: ItemRender, children: Record<string, ItemRender>): Promise<void> {
        if (this.game.itemSystem.states.hovered == item.id) {
            const { draw } = this.game.pipeline;
            const { bounds, texture } = render;
            draw.textureOutline(bounds.min.x, bounds.min.y, bounds.max.x, bounds.max.y, texture, PALETTE_RGB.ACCENT, 4);
        }
        if (attr.lastDrag) {
            const elapsed = Timer.now() - attr.lastDrag;
            if (elapsed > 1000) {
                delete attr.lastDrag;
                return;
            }
            const t = 1 - elapsed / 1000;
            const { draw } = this.game.pipeline;
            const { bounds, texture } = render;
            draw.textureOutline(bounds.min.x, bounds.min.y, bounds.max.x, bounds.max.y, texture, PALETTE_RGB.TOOLTIP_TEXT, Math.pow(t, 6) * 6);
        }
    }

    async mouse({ item }: AttributeInvoke<AttrDragging>, pool: ItemPool, event: ItemMouseEvent): Promise<void> {
        if (this.game.itemSystem.states.held === item.id) {
            if (event.kind === 'mouse-move') {
                item.transform.offset = event.offsetDelta.add(item.transform.offset);
            }
        }
    }

    async actions({ item, attr }: AttributeInvoke<AttrDragging>, pool: ItemPool, event: ItemMouseEvent, ctx: { actions: Action[] }): Promise<void> {
        if (!this.game.itemSystem.states.held && this.game.itemSystem.states.hovered === item.id) {
            ctx.actions.push({
                title: '持つ',
                invoke: async () => {
                    this.game.itemSystem.states.held = item.id;
                    this.game.itemSystem.dettachItem(item);
                },
            });
        }
        if (this.game.itemSystem.states.held === item.id) {
            ctx.actions.push({
                title: '離す',
                invoke: async () => {
                    this.game.itemSystem.states.held = undefined;
                    attr.lastDrag = Timer.now();
                },
            });
        }
    }
}
