import type { InputEvent } from '$lib/components/canvas/pipeline';
import { comparator } from '$lib/helper';
import { clamp, lerp } from '$lib/math/math';
import { Vec2 } from '$lib/math/vec2';
import { PALETTE_RGB } from '../colors';
import shadowUrl from '../resources/img/shadow.png';
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
            console.log(action?.title);
            this.currentIndex = 0;
        } else if (event.kind === 'mouse-wheel') {
            this.currentIndex += event.delta > 0 ? 1 : -1;
            this.currentIndex = clamp(this.currentIndex, 0, this.actions.length - 1);
        }
    }

    private readonly animationTimes: number[] = [];

    public async render() {
        const { draw, input, matrices } = this.game.pipeline;
        if (!this.actions.length) return;

        const padding = 32 + this.actions.length * 4; // メニュー外枠の余白
        const itemHeight = 36; // 1項目あたりの高さ
        draw.fontSize = 16;
        draw.fontFamily = 'Noto Sans JP';

        const shadow = (await this.game.asset.getTextureByUrl(shadowUrl).promise).unwrap.texture;

        // 1. メニューの横幅を決定するため、最も長いテキストの幅を計算する
        let maxTextWidth = 0;
        for (const action of this.actions) {
            const bounds = draw.measureTextActual(action.title);
            maxTextWidth = Math.max(maxTextWidth, bounds.width);
        }

        // パネル全体のサイズ
        const menuWidth = maxTextWidth + padding * 3 + 12; // テキスト幅 + 余白 + アクセントライン用のスペース
        const menuHeight = this.actions.length * itemHeight + padding * 2;
        const mouse = matrices.getViewToWorld().transform2(input.mouse.pos);

        const scale = 1 / this.game.renderer.scale;
        const isOverflowX = mouse.x * scale > this.game.renderer.bounds.max.x;
        const isOverflowY = mouse.y + menuHeight * scale > this.game.renderer.bounds.max.y;
        const startX = isOverflowX ? -menuWidth / 2 - 16 : 16;
        const startY = isOverflowY ? -menuHeight - 16 : 24;

        matrices.model.push();
        matrices.model.translate(mouse.x - menuWidth / 2, mouse.y, 1);
        matrices.model.scale(scale, scale, 1);

        draw.texture(
            startX, startY,
            startX + menuWidth, startY + menuHeight,
            shadow,
            { x: 0, y: 0, z: 0, w: 2 },
        );

        // 4. 各アクションの項目を描画
        for (let index = 0; index < this.actions.length; index++) {
            const action = this.actions[index];
            const isSelected = index === this.currentIndex;
            const itemY = startY + padding + index * itemHeight;

            const lastT = this.animationTimes[index] ??= isSelected ? 1 : 0;
            const t = lerp(lastT, isSelected ? 1 : 0, 0.6);
            this.animationTimes[index] = t;
            if (isSelected) {
                const offsetX = (1 - t) * -16;
                draw.rectangle(
                    startX + padding + 12 + offsetX, itemY + itemHeight - 3 - 4,
                    startX + padding + 12 + maxTextWidth + offsetX, itemY + itemHeight - 2 - 4,
                    PALETTE_RGB.TOOLTIP_TEXT,
                );
                draw.fontWeight = '700';
            } else {
                draw.fontWeight = '600';
            }
            draw.fontSize = isSelected ? 16 : 12;

            // テキストの描画
            const offsetX = (1 - t) * 16;
            const textPos = new Vec2(startX + padding + 12 + offsetX, itemY + 6); // Y位置はフォントに合わせて微調整してください
            await draw.textAlign(
                textPos,
                action.title,
                Vec2.ZERO,
                PALETTE_RGB.TOOLTIP_TEXT,
            );
        }

        matrices.model.pop();
    }
}
