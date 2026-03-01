import type { Draw } from '$lib/components/canvas/draw';
import type { InputEvent } from '$lib/components/canvas/pipeline';
import { AABB2 } from '$lib/math/aabb2';
import { Mat4 } from '$lib/math/mat4';
import { clamp, lerp } from '$lib/math/math';
import { Vec2 } from '$lib/math/vec2';
import { Vec4 } from '$lib/math/vec4';
import { PALETTE_RGB } from '../../colors';
import type { Game } from '../../core/game';
import { TRANSFORM_ORIGIN } from '../../core/transform';
import type { Item } from '../../item';
import type { PoolOptions } from '../../item/item';
import client_background from '../../resources/client_background.png';
import client_kitchen from '../../resources/client_kitchen.png';
import type { SceneHandler } from '../scene';
import ScreenKitchen from './ScreenKitchen.svelte';
import beef from './beef.png';

export interface SceneKitchenData {
    type: 'kitchen';
}

class ItemDrawer {
    private drawerHovered: boolean = false;
    private drawerOpened: boolean = false;
    private drawerColumns = 0;
    private drawerScroll = 0;
    private drawerScrollTarget = 0;

    constructor(
        private readonly game: Game,
    ) {}

    public handle(event: InputEvent) {
        if (event.kind === 'mouse-wheel' && this.drawerHovered) {
            const delta = event.delta > 0 ? 1 : -1;
            this.drawerScrollTarget = clamp(this.drawerScrollTarget + delta, 0, this.drawerColumns);
            this.drawerOpened = true;
            return true;
        }
    }

    public async draw() {
        const { matrices, draw } = this.game.pipeline;
        const { mouse } = this.game.pipeline.input;
        const t = 1 - Math.exp(-this.game.pipeline.time.delta / 64);
        const bounds = AABB2.from({
            min: new Vec2(matrices.width - 440, matrices.height / 2),
            max: new Vec2(matrices.width - 20, matrices.height),
        });
        draw.rectangle(bounds.min.x - 20, bounds.min.y - 40, matrices.width, matrices.height, PALETTE_RGB.BACKGROUND);
        const dimensions = bounds.dimensions();
        const center = bounds.center();
        draw.fontSize = 16;

        // Update entries
        this.drawerHovered = bounds.contains(mouse.pos);
        const desiredWidth = 210;
        const rows = Math.floor(dimensions.x / desiredWidth);
        const entryWidth = dimensions.x / rows;
        const entryHeight = 140;
        const gap = 20;

        const kitchen = this.game.states.kitchen.value;
        const entries = Object.values(kitchen.items);
        let index = 0;
        this.drawerColumns = Math.floor(entries.length / rows);
        this.drawerScroll = lerp(this.drawerScroll, this.drawerScrollTarget, t);
        for (const { id } of entries) {
            const data = this.game.itemSystem.items.get(id);
            if (!data) {
                delete kitchen.items[id];
                continue;
            }
            const row = index % rows;
            const column = Math.floor(index / rows) - this.drawerScroll;
            const listBounds = AABB2.from({
                min: new Vec2(bounds.min.x + entryWidth * row, bounds.min.y + column * entryHeight),
                max: new Vec2(bounds.min.x + entryWidth * (row + 1) - gap, bounds.min.y + (column + 1) * entryHeight - gap),
            });
            await this.drawDrawerEntry(draw, listBounds, data);
            index++;
        }

        const textWidth = draw.measureTextActual('食材').dimensions().x / 2 + 10;
        const separatorY = bounds.min.y - 20;
        draw.rectangle(bounds.min.x, separatorY, center.x - textWidth, separatorY + 2, PALETTE_RGB.ACCENT);
        draw.rectangle(center.x + textWidth, separatorY, matrices.width - 20, separatorY + 2, PALETTE_RGB.ACCENT);
        draw.fontSize = 16;
        draw.fontWeight = '600';
        await draw.textAlign({ x: center.x, y: separatorY }, '食材', Vec2.CENTER, PALETTE_RGB.ACCENT);
    }

    private async drawDrawerEntry(draw: Draw, bounds: AABB2, item: Item) {
        const { mouse } = this.game.pipeline.input;
        const roundness = 10;
        draw.roundedRect(bounds.min, bounds.max, roundness, PALETTE_RGB.OVERLAY_BACKGROUND);
        draw.fontWeight = 'normal';
        let hovered = bounds.contains(mouse.pos) && bounds.shrink({ x: roundness, y: roundness }).distance(mouse.pos) < roundness;
        if (hovered) {
            const removeBounds = new AABB2(
                new Vec2(bounds.max.x - 50, bounds.min.y + 10),
                new Vec2(bounds.max.x - 10, bounds.min.y + 50),
            );
            draw.roundedRect(removeBounds.min, removeBounds.max, roundness - 10, PALETTE_RGB.OVERLAY_OUTLINE);
            draw.fontSize = 12;
            await draw.textAlign(removeBounds.at(Vec2.CENTER), '✕', Vec2.CENTER, PALETTE_RGB.ACCENT);
            if (removeBounds.contains(mouse.pos) && removeBounds.shrink({ x: roundness - 10, y: roundness - 10 }).distance(mouse.pos) < roundness - 10) {
                hovered = false;
                draw.roundedRect(removeBounds.min, removeBounds.max, roundness - 10, PALETTE_RGB.ACCENT, 2);
                this.game.inputSystem.add({
                    title: 'アイテムを削除',
                    invoke: async () => {
                        const kitchen = this.game.states.kitchen.value;
                        delete kitchen.items[item.id];
                    },
                });
            } else {
                this.game.inputSystem.add({
                    title: 'アイテムを追加',
                    invoke: async () => {
                        const cloned = this.game.itemSystem.allocateItem(item);
                        const kitchen = this.game.states.kitchen.value;
                        kitchen.items[cloned.id] = { id: cloned.id };
                    },
                });
            }
        }
        draw.roundedRect(bounds.min, bounds.max, roundness, hovered ? PALETTE_RGB.ACCENT : PALETTE_RGB.OVERLAY_OUTLINE, hovered ? 3 : 2);
        const renderResult = await this.game.itemSystem.getItemRender(item);
        draw.fontSize = 16;
        if (renderResult.type === 'loading') {
            await draw.textAlign(bounds.at({ x: 0.5, y: 1 }).sub({ x: 0, y: 20 }), '...', Vec2.CENTER, PALETTE_RGB.ACCENT);
            return;
        } else if (renderResult.type === 'rendered') {
            const { texture, bounds: itemBounds } = renderResult.render;
            const textureBounds = bounds.offset({ x: 0, y: -15 }).shrink({ x: 20, y: 40 }).fit(itemBounds);
            draw.texture(
                textureBounds.min.x, textureBounds.min.y,
                textureBounds.max.x, textureBounds.max.y,
                texture,
            );
        }
        await draw.textAlign(bounds.at({ x: 0.5, y: 1 }).sub({ x: 0, y: 20 }), item.id, Vec2.CENTER, PALETTE_RGB.ACCENT);
    }
}

export class SceneKitchen implements SceneHandler<SceneKitchenData> {
    public readonly component = ScreenKitchen;
    private readonly drawer: ItemDrawer;

    constructor(
        private readonly game: Game,
    ) {
        this.drawer = new ItemDrawer(game);
        // this.addTestItem();
    }

    private addTestItem() {
        const item = this.game.itemSystem.allocateItem({
            attrs: {
                image: {
                    asset: {
                        type: 'url',
                        url: beef,
                    },
                },
                dragging: {
                    active: true,
                },
                container: {
                    active: true,
                },
            },
            transform: TRANSFORM_ORIGIN,
            children: [],
        });
        const kitchen = this.game.states.kitchen.value;
        kitchen.items[item.id] = { id: item.id };
    }

    async handle(scene: SceneKitchenData) {
        const { draw, input, matrices } = this.game.pipeline;
        const kitchen = this.game.states.kitchen.value;
        draw.rectangle(0, 0, 400, 100, Vec4.ONE);
        const texBackground = (await this.game.assetManager.getTextureByUrl(client_background).promise).unwrap;
        const texKitchen = (await this.game.assetManager.getTextureByUrl(client_kitchen).promise).unwrap;
        draw.texture(0, 0, matrices.width, matrices.height, texBackground);
        draw.texture(0, 0, matrices.width, matrices.height, texKitchen);
        const bounds = new AABB2(new Vec2(0, matrices.height / 2), new Vec2(matrices.width, matrices.height));
        draw.rectangle(...bounds.toArray(), PALETTE_RGB.ACCENT.with({ w: 0.5 }));
        const KITCHEN_OPTIONS: PoolOptions = {
            transform: Mat4.IDENTITY.scale(0.5, 0.5, 1.0),
            bounds,
        };
        await this.game.itemSystem.renderPool(kitchen, KITCHEN_OPTIONS);
        await this.drawer.draw();
        for (const event of input) {
            if (this.drawer.handle(event)) {
                return;
            }
            await this.game.itemSystem.handleInput(kitchen, KITCHEN_OPTIONS, event);
            await this.game.inputSystem.handle(event);
        }
    }
}
