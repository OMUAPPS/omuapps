import type { InputEvent } from '$lib/components/canvas/pipeline';
import { Vec2 } from '$lib/math/vec2';
import { PALETTE_RGB } from '../colors';
import type { Game } from './game';

export interface Action {
    title: string;
    invoke(): Promise<void>;
}

export class InputSystem {
    public readonly actions: Action[] = [];

    constructor(
        private readonly game: Game,
    ) { }

    public add(...action: Action[]) {
        this.actions.push(...action);
    }

    public clear() {
        this.actions.length = 0;
    }

    public async handle(event: InputEvent) {
        // 4. Trigger Action (Mouse Down)
        if (event.kind === 'mouse-down') {
            const action = this.actions.at(-1);
            await action?.invoke();
        }
    }

    public async render() {
        const { draw, input } = this.game.pipeline;
        // Render Actions (UI overlay)
        let offsetY = 20;
        const padding = 10;
        draw.fontSize = 16;
        for (let index = this.actions.length - 1; index >= 0; index--) {
            const action = this.actions[index];
            const bounds = draw.measureTextActual(action.title);
            const pos = { x: input.mouse.pos.x + padding * 2, y: input.mouse.pos.y + offsetY + padding };
            draw.rectangle(bounds.min.x + pos.x - padding, bounds.min.y + pos.y - padding / 2, bounds.max.x + pos.x + padding, bounds.max.y + pos.y + padding / 2, PALETTE_RGB.TOOLTIP_BG);
            await draw.textAlign(
                pos,
                action.title,
                Vec2.ZERO,
                PALETTE_RGB.TOOLTIP_TEXT,
            );
            offsetY += 30;
        }
    }
}
