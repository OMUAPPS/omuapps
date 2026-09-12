import type { InputEvent } from '$lib/components/canvas/pipeline';
import { comparator } from '$lib/helper';
import { clamp } from '$lib/math/math';
import { Vec2 } from '$lib/math/vec2';
import { PALETTE_RGB } from '../colors';
import type { Game } from './game';

export interface Action {
    title: string;
    id: string;
    priority: number;
    reset?: boolean;
    disabled?: boolean;
    invoke(): Promise<void>;
}

export class InputSystem {
    public readonly actions: Action[] = [];
    private lastAction?: Action;
    private currentAction?: Action;

    constructor(
        private readonly game: Game,
    ) { }

    get current(): Action | undefined {
        return this.currentAction;
    }

    public add(...action: Action[]) {
        this.actions.push(...action);
        this.actions.sort(comparator((action) => -action.priority));
    }

    public clear() {
        this.actions.length = 0;
    }

    public async handle(event: InputEvent) {
        // 4. Trigger Action (Mouse Down)
        if (this.game.fridge.hovered) {
            this.currentAction = this.actions.at(-1);
            this.actions.splice(1);
        }
        if (event.kind === 'mouse-down') {
            const index = this.actions.findIndex((action) => action.id === this.currentAction?.id);
            const action = index === -1 ? this.actions[0] : this.actions[index];
            this.lastAction = action;
            if (action && !action.disabled) {
                await action.invoke();
                console.log(action.title);
                if (action.reset) {
                    this.currentAction = undefined;
                }
            }
        } else if (event.kind === 'mouse-wheel') {
            if (!this.actions.length || event.delta === 0) return;
            const index = Math.max(0, this.actions.findIndex((action) => action.id === this.currentAction?.id));
            const actionIndex = clamp(index + (event.delta > 0 ? 1 : -1), 0, this.actions.length - 1);
            this.currentAction = this.actions[actionIndex];
        }
    }

    public async render() {
        const { draw, input, matrices } = this.game.pipeline;
        if (!this.actions.length) return;
        if (this.game.fridge.hovered) {
            this.currentAction = undefined;
            this.actions.splice(1);
        }

        const padding = 8;
        const itemHeight = 36;
        const multiple = this.actions.length > 1;
        const hint = 'ホイールで選択を切り替え ↕';
        const click = 'クリック';
        const previousFont = { size: draw.fontSize, family: draw.fontFamily, weight: draw.fontWeight };
        draw.fontFamily = 'Noto Sans JP';
        draw.fontWeight = '600';
        draw.fontSize = 12;
        const clickWidth = draw.measureTextActual(click).width + 16;
        const hintWidth = multiple ? draw.measureTextActual(hint).width + 24 : 0;
        draw.fontSize = 16;
        const titleWidth = Math.max(...this.actions.map((action) => draw.measureTextActual(action.title).width));
        const menuWidth = Math.max(titleWidth + clickWidth + 56, hintWidth) + padding * 2;
        const menuHeight = this.actions.length * itemHeight + padding * 2 + (multiple ? 32 : 0);
        const mouse = matrices.getViewToWorld().transform2(input.mouse.pos);
        const { bounds } = this.game.renderer;
        // Layout uses pixels; positioning and viewport bounds use world coordinates.
        const scale = 1 / this.game.renderer.scale;
        const margin = 8 * scale;
        const width = menuWidth * scale;
        const height = menuHeight * scale;
        const right = mouse.x + 20 * scale;
        const below = mouse.y + 24 * scale;
        const x = clamp(
            right + width <= bounds.max.x - margin ? right : mouse.x - width - 20 * scale,
            bounds.min.x + margin, Math.max(bounds.min.x + margin, bounds.max.x - width - margin),
        );
        const y = clamp(
            below + height <= bounds.max.y - margin ? below : mouse.y - height - 24 * scale,
            bounds.min.y + margin, Math.max(bounds.min.y + margin, bounds.max.y - height - margin),
        );
        const currentAction = this.actions.find((action) => action.id === this.currentAction?.id) ?? this.actions[0];
        const textColor = PALETTE_RGB.BOARD_TEXT;

        matrices.model.push();
        matrices.model.translate(x, y, 1);
        matrices.model.scale(scale, scale, 1);
        try {
            draw.rectangle(2, 4, menuWidth + 2, menuHeight + 4, PALETTE_RGB.ITEM_SHADOW);
            draw.rectangle(0, 0, menuWidth, menuHeight, PALETTE_RGB.BACKGROUND);
            for (const [index, action] of this.actions.entries()) {
                const selected = action.id === currentAction.id;
                const itemY = padding + index * itemHeight;
                const color = action.disabled ? textColor.with({ w: 0.5 })
                    : selected ? PALETTE_RGB.TOOLTIP_TEXT : textColor;
                if (selected) {
                    draw.rectangle(padding, itemY, menuWidth - padding, itemY + itemHeight,
                        action.disabled ? textColor.with({ w: 0.08 }) : PALETTE_RGB.ACCENT);
                }
                draw.fontSize = 16;
                if (selected) {
                    await draw.textAlign(new Vec2(padding + 8, itemY + itemHeight / 2), '▶', { x: 0, y: 0.5 }, color);
                }
                await draw.textAlign(new Vec2(padding + 28, itemY + itemHeight / 2), action.title, { x: 0, y: 0.5 }, color);
                if (selected && !action.disabled) {
                    const badgeX = menuWidth - padding - clickWidth - 8;
                    draw.rectangle(badgeX, itemY + 7, badgeX + clickWidth, itemY + itemHeight - 7,
                        PALETTE_RGB.TOOLTIP_TEXT.with({ w: 0.16 }));
                    draw.fontSize = 12;
                    await draw.textAlign(new Vec2(badgeX + clickWidth / 2, itemY + itemHeight / 2), click, { x: 0.5, y: 0.5 }, color);
                }
            }
            if (multiple) {
                const footerY = padding + this.actions.length * itemHeight + 4;
                draw.rectangle(padding + 4, footerY, menuWidth - padding - 4, footerY + 1, textColor.with({ w: 0.15 }));
                draw.fontSize = 12;
                await draw.textAlign(new Vec2(padding + 12, footerY + 16), hint, { x: 0, y: 0.5 }, textColor.with({ w: 0.75 }));
            }
        } finally {
            matrices.model.pop();
            draw.fontSize = previousFont.size;
            draw.fontFamily = previousFont.family;
            draw.fontWeight = previousFont.weight;
        }
    }
}
