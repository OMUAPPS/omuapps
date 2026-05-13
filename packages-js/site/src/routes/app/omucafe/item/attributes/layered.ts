import type { GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext';
import { AABB2 } from '$lib/math/aabb2';
import { clamp, lerp, lerp01 } from '$lib/math/math';
import { Vec2, type Vec2Like } from '$lib/math/vec2';
import { Vec4 } from '$lib/math/vec4';
import type { AudioClip } from '../../audio';
import { PALETTE_RGB } from '../../colors';
import { getAssetKey, type Asset } from '../../core/asset';
import type { Game } from '../../core/game';
import type { AssetTransform } from '../../core/game-renderer';
import { type ValidateResult } from '../../core/helper';
import { getTransform } from '../../core/transform';
import type {
    ActionContext,
    AttributeHandler,
    AttributeInvoke,
    CalculateBoundsContext,
    HashContext,
    ItemMouseEvent,
    ItemRender,
    ItemRenderContext,
} from '../attribute-handler';
import type { Item, ItemPool } from '../item';
import LayeredEditor from './LayeredEditor.svelte';

export interface LayerBase {
    name: string;
    side: { asset: Asset };
    top: { asset: Asset };
    volume: number;
    pourSound?: AudioClip;
}

export interface LayerSolid extends LayerBase {
    type: 'solid';
}

export interface LayerLiquid extends LayerBase {
    type: 'liquid';
    blending: number;
}

export type Layer = LayerSolid | LayerLiquid;

export interface AttrLayered {
    positionX: number;
    positionY: number;
    height: number;
    width: number;
    curvature: {
        top: number;
        bottom: number;
    };
    layers: Layer[];
    capacity: number;
    mask?: AssetTransform;
    pour?: {
        point: Vec2Like;
        infinite: boolean;
        volume: number;
        target?: string;
    };
    pourSource?: string;
}

export class AttributeLayered implements AttributeHandler<AttrLayered> {
    readonly name = '層構造';
    readonly editor = LayeredEditor;

    private readonly maskBuffer: GlFramebuffer;
    private readonly maskTexture: GlTexture;
    private readonly layerBuffer: GlFramebuffer;
    private readonly layerTexture: GlTexture;

    constructor(private readonly game: Game) {
        const { context } = game.pipeline;

        // --- マスク用テクスチャ・バッファの初期化 ---
        this.maskBuffer = context.createFramebuffer();
        this.maskTexture = context.createTexture();
        this.maskTexture.use(() => {
            this.maskTexture.setImage(null, { width: 4, height: 4, internalFormat: 'rgba', format: 'rgba' });
            this.maskTexture.setParams({
                magFilter: 'linear', minFilter: 'linear', wrapS: 'clamp-to-edge', wrapT: 'clamp-to-edge',
            });
        });
        this.maskBuffer.use(() => this.maskBuffer.attachTexture(this.maskTexture));

        // --- レイヤー描画用テクスチャ・バッファの初期化 ---
        this.layerBuffer = context.createFramebuffer();
        this.layerTexture = context.createTexture();
        this.layerTexture.use(() => {
            this.layerTexture.setImage(null, { width: 4, height: 4, internalFormat: 'rgba', format: 'rgba' });
            this.layerTexture.setParams({
                magFilter: 'linear', minFilter: 'linear', wrapS: 'clamp-to-edge', wrapT: 'clamp-to-edge',
            });
        });
        this.layerBuffer.use(() => this.layerBuffer.attachTexture(this.layerTexture));
    }

    create(): AttrLayered {
        return {
            positionX: 0,
            positionY: 0,
            curvature: { top: 1, bottom: 1 },
            height: 100,
            width: 100,
            capacity: 400,
            layers: [],
        };
    }

    validate(value: AttrLayered): ValidateResult<AttrLayered> {
        return { type: 'valid', value };
    }

    async hash(invoke: AttributeInvoke<AttrLayered>, ctx: HashContext): Promise<void> {
        ctx.hash += `layered:${JSON.stringify(invoke.attr)}`;
    }

    // ==========================================
    // アクション関連 (捨てる・注ぐ)
    // ==========================================

    async actions({ item, attr }: AttributeInvoke<AttrLayered>, pool: ItemPool, event: ItemMouseEvent, ctx: ActionContext): Promise<void> {
        const { states } = this.game.item;
        if (states.held !== item.id) return;

        const last = attr.layers.at(-1);
        const scene = this.game.states.scene.value;
        const isInEdit = scene.type === 'factory' || (scene.type === 'kitchen' && !!scene.editMode);

        // 捨てるアクション
        if (last && (!attr.pour?.infinite || isInEdit)) {
            ctx.actions.push({
                title: `${last.name}を捨てる`,
                id: `layered-drop-${item.id}`,
                priority: 190, // 200 - 10
                invoke: async () => {
                    attr.layers.pop();
                    this.game.item.updateItem(item);
                },
            });
        }

        if (!attr.pour) return;
        const { pour } = attr;

        // 対象アイテムの探索
        const transform = this.game.item.getWorldTransform(item);
        const worldPoint = transform.xform(pour.point);
        const hitId = await this.game.item.raycast(pool, worldPoint, [item.id]);

        const hitItem = hitId ? this.game.item.get(hitId) : undefined;
        const target = hitItem ? this.getTraverseLayered(hitItem) : undefined;

        if (!target || target.targetLayered.pour?.infinite) {
            pour.target = undefined;
            return;
        }

        const { targetItem, targetLayered } = target;
        pour.target = targetItem.id;
        targetLayered.pourSource = item.id;

        const targetCapacityLeft = targetLayered.capacity - this.getTotalVolume(targetLayered.layers);
        const isFull = targetCapacityLeft <= 0;
        const sourceLayers = attr.layers;
        const pourVolume = pour.volume;

        // 注ぐアクション
        ctx.actions.push({
            title: isFull ? `${targetItem.name}はいっぱいです` : `${targetItem.name}に注ぐ`,
            id: `layered-pour-${item.id}`,
            priority: 200,
            invoke: async () => {
                this.executePour(targetLayered, sourceLayers, pourVolume, pour.infinite);
                this.game.item.updateItem(item);
                this.game.item.updateItem(targetItem);

                const lastLayer = sourceLayers.at(-1);
                if (!isFull && lastLayer?.pourSound) {
                    this.game.audio.start(lastLayer.pourSound);
                }
            },
        });
    }

    // ==========================================
    // レンダリング・バウンズ計算
    // ==========================================

    async renderOverlayPost({ item, attr }: AttributeInvoke<AttrLayered>, _pool: ItemPool, render: ItemRender): Promise<void> {
        const { matrices, draw } = this.game.pipeline;
        const { states } = this.game.item;

        // 注ぎ元のハイライト
        const sourceItem = attr.pourSource && states.held === attr.pourSource ? this.game.item.get(attr.pourSource) : undefined;
        if (sourceItem?.attrs.layered?.pour?.target === item.id) {
            const { min, max } = render.renderBounds;
            draw.textureOutline(min.x, min.y, max.x, max.y, render.texture, PALETTE_RGB.TOOLTIP_TEXT, 6);
        }

        const scene = this.game.states.scene.value;
        if (scene.type !== 'factory' || scene.selecting?.type !== 'edit_item' || scene.selecting.itemId !== item.id) return;

        const { mask, pour } = attr;
        if (mask) {
            const textureState = this.game.asset.getTexture(mask.asset);
            if (textureState.type === 'ready') {
                const tex = textureState.data.texture;
                const halfSize = new Vec2(tex.width / 2, tex.height / 2);
                const bounds = new AABB2(halfSize.scale(-1), halfSize);
                const mat = getTransform(mask.transform).getMat4();

                matrices.model.scope(() => {
                    matrices.model.multiply(mat);
                    draw.texture(...bounds.toArray(), tex, Vec4.ONE.with({ w: 0.2 }));
                });
            }
        }

        if (pour) {
            draw.circle(pour.point.x, pour.point.y, 0, 10, Vec4.ONE);
        }
    }

    async getRenderPass({ attr }: AttributeInvoke<AttrLayered>, ctx: ItemRenderContext): Promise<void> {
        if (attr.layers.length > 0) {
            ctx.passes.push({
                order: 500,
                render: async () => await this.render(attr, ctx.render),
            });
        }
    }

    async render(attr: AttrLayered, render: ItemRender): Promise<void> {
        const { mask } = attr;
        if (!mask) {
            await this.renderLayers(attr);
            return;
        }

        const { draw, context } = this.game.pipeline;
        const { gl } = context;
        const { width, height } = render.renderBounds;

        this.maskTexture.use(() => this.maskTexture.ensureSize(width, height));
        await this.maskBuffer.useAsync(async () => {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            await this.game.renderer.drawAssetTransform(mask);
        });

        this.layerTexture.use(() => this.layerTexture.ensureSize(width, height));
        await this.layerBuffer.useAsync(async () => {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            await this.renderLayers(attr);
        });

        draw.textureMask(...render.renderBounds.toArray(), this.layerTexture, this.maskTexture);
    }

    async bounds({ attr }: AttributeInvoke<AttrLayered>, ctx: CalculateBoundsContext): Promise<void> {
        const t = clamp(this.getTotalVolume(attr.layers) / attr.capacity, 0, 1);
        const topC = lerp01(attr.curvature.bottom, attr.curvature.top, t);
        const bounds = new AABB2(
            new Vec2(-attr.width, lerp01(attr.positionY, attr.positionY - attr.height, t) - topC * 2),
            new Vec2(attr.width, attr.positionY),
        );
        ctx.render = ctx.render.union(bounds);
    }

    // ==========================================
    // プライベート・ヘルパーメソッド
    // ==========================================

    private async renderLayers(attr: AttrLayered): Promise<void> {
        const { draw } = this.game.pipeline;
        const { capacity, width, positionX, positionY, height, curvature, layers } = attr;

        const left = positionX - width / 2;
        const right = positionX + width / 2;

        const getT = (volume: number) => clamp(volume / capacity, 0, 1);
        const getY = (t: number) => lerp(positionY, positionY - height, t);
        const getCurvature = (t: number) => lerp(curvature.bottom, curvature.top, t);

        let total = 0;
        for (let index = 0; index < layers.length; index++) {
            const layer = layers[index];
            const isLastLayer = index === layers.length - 1;

            const bottomT = getT(total);
            const bottomY = getY(bottomT);
            const bottomC = getCurvature(bottomT);

            total += layer.volume;

            const topT = getT(total);
            const topY = getY(topT);
            const topC = getCurvature(topT);

            const [sideRes, topRes] = await Promise.all([
                this.game.asset.getTexture(layer.side.asset).promise,
                this.game.asset.getTexture(layer.top.asset).promise,
            ]);

            if (sideRes.type === 'error' || topRes.type === 'error') continue;

            const bounds = new AABB2(new Vec2(left, topY - topC), new Vec2(right, bottomY));
            draw.textureCurved(bounds, sideRes.data.texture, undefined, -topC, bottomC);

            if (isLastLayer || layer.type === 'solid') {
                const topBounds = new AABB2(new Vec2(left, topY - topC * 2), new Vec2(right, topY));
                draw.textureCurved(topBounds, topRes.data.texture, undefined, topC, topC);
            }
        }
    }

    private executePour(target: AttrLayered, source: Layer[], volume: number, infinite: boolean): void {
        const lastLayer = source.pop();
        if (!lastLayer) return;

        const targetLastLayer = target.layers.at(-1);
        const canMerge = targetLastLayer && this.isLayerKindEqual(targetLastLayer, lastLayer);
        const targetCapacityLeft = target.capacity - this.getTotalVolume(target.layers);
        const subVolume = Math.min(lastLayer.volume, volume, targetCapacityLeft);

        if (canMerge) {
            if (!infinite) lastLayer.volume -= subVolume;
            targetLastLayer.volume += subVolume;
        } else {
            target.layers.push({ ...lastLayer, volume: subVolume });
        }

        if (infinite || lastLayer.volume >= volume) {
            source.push(lastLayer);
        }
    }

    private getTraverseLayered(targetItem: Item): { targetItem: Item; targetLayered: AttrLayered } | undefined {
        if (targetItem.attrs.layered) return { targetItem, targetLayered: targetItem.attrs.layered };
        if (!targetItem.parent) return undefined;

        const parent = this.game.item.get(targetItem.parent);
        return parent ? this.getTraverseLayered(parent) : undefined;
    }

    private isLayerKindEqual(layerA: Layer, layerB: Layer): boolean {
        return layerA.type === layerB.type &&
               layerA.name === layerB.name &&
               getAssetKey(layerA.side.asset) === getAssetKey(layerB.side.asset) &&
               getAssetKey(layerA.top.asset) === getAssetKey(layerB.top.asset);
    }

    private getTotalVolume(layers: Layer[]): number {
        return layers.reduce((sum, layer) => sum + layer.volume, 0);
    }
}
