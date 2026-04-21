import { AABB2 } from '$lib/math/aabb2';
import { lerp } from '$lib/math/math';
import { Vec2 } from '$lib/math/vec2';
import { Vec4 } from '$lib/math/vec4';
import { Timer } from '$lib/timer';
import { PALETTE_RGB } from '../../../colors';
import type { Game } from '../../../core/game';
import type { Product } from '../../../core/game-state';
import { SCENE_CONFIG } from '../config';
import board from '../img/board.png';

export class BoardRenderer {
    constructor(private readonly game: Game) {}

    async render() {
        const { draw } = this.game.pipeline;
        const { asset, renderer, states } = this.game;
        const cfg = SCENE_CONFIG.UI.BOARD;

        const boardTex = (await asset.getTextureByUrl(board).promise).unwrap.texture;
        const bounds = AABB2.fromSize(boardTex).scale(1.4).setAt({ x: 0.5, y: 1 }, renderer.bounds.at({ x: 0.5, y: 1 })).offset({ x: 0, y: 100 });
        draw.texture(...bounds.toArray(), boardTex);

        const innerBounds = bounds.shrink({ x: (100 + 20) * 1.4, y: (100 + 30) * 1.4 }).offset({ x: 0, y: -10 * 1.4 }).shrink({ x: 40, y: 40 });
        const products = Array.from(states.products.values()).filter((product) => !product.hidden);
        const pageCount = Math.ceil(products.length / cfg.ITEMS_PER_PAGE);
        const [timer, listBounds] = innerBounds.split({ direction: 'y', ratio: pageCount > 1 ? 0.05 : 0, gap: 10 });
        const [itemTop, itemBottom] = listBounds.split({ direction: 'y', ratio: 0.5, gap: 10 });

        const time = Timer.now();
        const t = time / cfg.DURATION_MS % 1;
        const opacity = Math.pow(Math.min(1, Math.min(Math.abs(t), Math.abs(1 - t)) * 20), 2);
        const pageIndex = Math.floor(time / cfg.DURATION_MS) % pageCount;

        if (pageCount > 1) {
            const [barBounds, timerBounds] = timer.split({ direction: 'x', ratio: 0.9, gap: 10 });
            draw.rectangle(...barBounds.toArray(), PALETTE_RGB.BOARD_TIMER_BG);
            draw.rectangle(...barBounds.with({ max: { x: lerp(barBounds.min.x, barBounds.max.x, 1 - t) } }).toArray(), PALETTE_RGB.BOARD_ACCENT.with({ w: opacity }));
            await draw.textAlign(timerBounds.center, `${pageIndex + 1} / ${pageCount}`, Vec2.CENTER, PALETTE_RGB.BOARD_TEXT);
        }

        const productTop = products[pageIndex * cfg.ITEMS_PER_PAGE];
        const productBottom = products[pageIndex * cfg.ITEMS_PER_PAGE + 1];

        if (productTop) await this.renderBoardEntry(productTop, itemTop, opacity);
        if (productBottom) await this.renderBoardEntry(productBottom, itemBottom, opacity);
    }

    private async renderBoardEntry(product: Product, entryBounds: AABB2, opacity: number) {
        const { itemRenderer, item: itemSystem, pipeline: { draw } } = this.game;
        const item = itemSystem.get(product.itemId);
        if (!item) return;

        draw.rectangle(...entryBounds.toArray(), PALETTE_RGB.BOARD_ENTRY_BG.with({ w: opacity }));
        const [previewBounds, infoBounds] = entryBounds.split({ direction: 'x', ratio: 0.3, gap: 20 });
        const renderState = await itemRenderer.getItemRender(item);

        if (renderState.type === 'rendered') {
            const { renderBounds, texture } = renderState.render;
            draw.texture(...previewBounds.shrink({ x: 40, y: 40 }).fit(renderBounds.size).toArray(), texture, Vec4.ONE.with({ w: opacity }));
        }

        draw.rectangle(previewBounds.max.x - 2, previewBounds.min.y + 20, previewBounds.max.x + 2, previewBounds.max.y - 20, PALETTE_RGB.BOARD_ACCENT);

        const shortestAlias = product.aliases.reduce((shortest, alias) => alias.length < shortest.length ? alias : shortest, product.name);
        await this.drawTextFitWidth(infoBounds.at({ x: 0, y: 0.4 }), product.name, infoBounds.size.x - 40, PALETTE_RGB.BOARD_TEXT.with({ w: opacity }), 54);
        await this.drawTextFitWidth(infoBounds.at({ x: 0, y: 0.7 }), `「#${shortestAlias}」とコメントして注文`, infoBounds.size.x - 40, PALETTE_RGB.BOARD_ACCENT.with({ w: opacity }), 36);
    }

    private async drawTextFitWidth(anchor: Vec2, text: string, maxWidth: number, color: Vec4, fontSize: number) {
        const { draw } = this.game.pipeline;
        draw.fontSize = fontSize;
        const textWidth = draw.measureTextActual(text).width;
        const scale = Math.min(1, maxWidth / textWidth);
        draw.fontSize = fontSize * scale;
        await draw.textAlign(anchor, text, { x: 0, y: 0.5 }, color);
    }
}
