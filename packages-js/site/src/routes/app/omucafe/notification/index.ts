import { AABB2 } from '$lib/math/aabb2';
import { invLerp, lerp } from '$lib/math/math';
import { Vec2 } from '$lib/math/vec2';
import { Vec4 } from '$lib/math/vec4';
import { Timer } from '$lib/timer';
import { PALETTE_RGB } from '../colors';
import type { Game } from '../core/game';

export interface NotificationData {
    icon: string;
    title: string;
    description: string;
    duration: number;
}

export interface NotificationState {
    data: NotificationData;
    time: number;
}

function easeOutBack(x: number): number {
    const c1 = 0.5;
    const c3 = c1 + 1;
    const c4 = 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    return Math.pow(c4, 5);
}

export class NotificationSystem {
    private items: NotificationState[] = [];

    constructor(
        private readonly game: Game,
    ) {
    }

    public add(data: NotificationData) {
        this.items.push({
            data,
            time: Timer.now(),
        });
    }

    public async render() {
        const { draw, matrices } = this.game.pipeline;
        const { bounds } = this.game.renderer;
        const size = 32;
        const padding = new Vec2(48, 48);
        draw.fontSize = size;
        let offsetY = bounds.min.y + 200;
        draw.fontFamily = 'Zen Maru Gothic';
        draw.fontWeight = '600';
        const time = Timer.now();
        for (let index = 0; index < this.items.length; index++) {
            matrices.model.push();
            const state = this.items[index];
            const { data } = state;
            const elapsed = time - state.time;
            const out = Math.max(1, (elapsed - data.duration) / 100);
            const tValue = easeOutBack(1 - 1 / (elapsed / 100 + 1)) / (out ** 3);
            matrices.model.translate(0, offsetY + (tValue - 1) * size * 2, 0);
            matrices.model.scale(tValue, tValue, 1);
            draw.fontFamily = 'Zen Maru Gothic';
            draw.fontSize = size;
            const measure = this.measureWidths(state);
            const bounds = new AABB2(
                new Vec2(-measure.total / 2, -size / 2),
                new Vec2(measure.total / 2, size / 2),
            ).expand({ x: lerp(padding.x / 2, padding.x, tValue), y: padding.y });
            const sine = invLerp(-1, 1, Math.sin(time / 1000 * Math.PI - index));
            const color = PALETTE_RGB.ACCENT.lerp(PALETTE_RGB.SECONDARY, sine).with({ w: tValue });
            draw.roundedRect(bounds.min, bounds.max, bounds.height / 2, color);
            let x = measure.total * -0.5;
            await draw.textAlign({ x, y: 4 }, data.icon, { x: 0, y: 0.5 }, Vec4.ONE);
            x += measure.icon;
            x += measure.gap;
            draw.fontFamily = 'Zen Maru Gothic';
            draw.fontSize = size;
            await draw.textAlign({ x, y: -12 }, data.title, { x: 0, y: 0.5 }, PALETTE_RGB.NOTIFICATION_TEXT);
            draw.fontSize = size / 3 * 2;
            await draw.textAlign({ x, y: 20 }, data.description, { x: 0, y: 0.5 }, PALETTE_RGB.NOTIFICATION_TEXT);
            offsetY += (size + padding.y * 3) * tValue;
            matrices.model.pop();
        }
        const timeout = 3000;
        this.items = this.items.filter(item => time - item.time < item.data.duration + timeout);
        draw.fontFamily = 'Noto Sans JP';
    }

    private measureWidths(item: NotificationState) {
        const { draw } = this.game.pipeline;
        const { data } = item;
        draw.fontFamily = 'tabler-icons';
        const icon = draw.measureTextActual(data.icon).width;
        draw.fontFamily = 'Zen Maru Gothic';
        const title = draw.measureTextActual(data.title).width;
        const description = draw.measureTextActual(data.description).width / 3 * 2;
        const gap = 16;
        return {
            icon,
            title: Math.max(title, description),
            gap,
            total: icon + gap + Math.max(title, description),
        };
    }
}
