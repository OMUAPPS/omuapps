import type { InputEvent } from '$lib/components/canvas/pipeline';
import { comparator } from '$lib/helper';
import { clamp } from '$lib/math/math';
import { Vec2 } from '$lib/math/vec2';
import { PALETTE_RGB } from '../colors';
import type { Game } from './game';

export interface Action {
    title: string;
    priority: number;
    invoke(): Promise<void>;
}

export class InputSystem {
    public readonly actions: Action[] = [];
    private currentIndex = 0;

    constructor(
        private readonly game: Game,
    ) { }

    public add(...action: Action[]) {
        this.actions.push(...action);
        this.actions.sort(comparator((action) => -action.priority));
        this.currentIndex = clamp(this.currentIndex, 0, this.actions.length - 1);
    }

    public clear() {
        this.actions.length = 0;
    }

    public async handle(event: InputEvent) {
        // 4. Trigger Action (Mouse Down)
        if (event.kind === 'mouse-down') {
            const action = this.actions.at(this.currentIndex);
            await action?.invoke();
            this.currentIndex = 0;
        } else if (event.kind === 'mouse-wheel') {
            this.currentIndex += event.delta > 0 ? 1 : -1;
            this.currentIndex = clamp(this.currentIndex, 0, this.actions.length - 1);
        }
    }

    public async render() {
        const { draw, input, matrices } = this.game.pipeline;
        // Render Actions (UI overlay)
        if (!this.actions.length) return;
        const padding = 10;
        draw.fontSize = 16;
        const mouse = matrices.getViewToWorld().transform2(input.mouse.pos);
        matrices.model.push();
        matrices.model.translate(mouse.x, mouse.y, 1);
        matrices.model.scale(1 / this.game.renderer.scale, 1 / this.game.renderer.scale, 1);
        for (let index = 0; index < this.actions.length; index++) {
            const action = this.actions[index];
            const title = action.title;
            const bounds = draw.measureTextActual(title);
            const offsetY = 30 * index;
            const pos = new Vec2(padding * 2, offsetY + padding);
            draw.rectangle(bounds.min.x + pos.x - padding, bounds.min.y + pos.y - padding / 2, bounds.max.x + pos.x + padding, bounds.max.y + pos.y + padding / 2, PALETTE_RGB.TOOLTIP_BG);
            draw.fontWeight = '500';
            await draw.textAlign(
                pos,
                title,
                Vec2.ZERO,
                PALETTE_RGB.TOOLTIP_TEXT,
            );
        }

        const pos = new Vec2(padding * 2, 30 * this.currentIndex + padding);
        draw.triangle(
            pos.add({ x: 0 - 9, y: -6 + 8 }),
            pos.add({ x: 6 - 9, y: 0 + 8 }),
            pos.add({ x: 0 - 9, y: 6 + 8 }),
            PALETTE_RGB.TOOLTIP_TEXT,
        );
        matrices.model.pop();
    }
}
