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
import type { ActionContext, AttributeHandler, AttributeInvoke, CalculateBoundsContext, ItemMouseEvent, ItemRender } from '../attribute-handler';
import type { ItemPool } from '../item';
import LayeredEditor from './LayeredEditor.svelte';

export interface LayerBase {
    name: string;
    side: {
        asset: Asset;
    };
    top: {
        asset: Asset;
    };
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
        this.maskBuffer = context.createFramebuffer();
        this.maskTexture = context.createTexture();
        this.maskTexture.use(() => {
            this.maskTexture.setImage(null, {
                width: 4,
                height: 4,
                internalFormat: 'rgba',
                format: 'rgba',
            });
            this.maskTexture.setParams({
                magFilter: 'linear',
                minFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
        });
        this.maskBuffer.use(() => {
            this.maskBuffer.attachTexture(this.maskTexture);
        });

        this.layerBuffer = context.createFramebuffer();
        this.layerTexture = context.createTexture();
        this.layerTexture.use(() => {
            this.layerTexture.setImage(null, {
                width: 4,
                height: 4,
                internalFormat: 'rgba',
                format: 'rgba',
            });
            this.layerTexture.setParams({
                magFilter: 'linear',
                minFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
        });
        this.layerBuffer.use(() => {
            this.layerBuffer.attachTexture(this.layerTexture);
        });
    }

    create(): AttrLayered {
        return {
            positionX: 0,
            positionY: 0,
            curvature: {
                top: 1,
                bottom: 1,
            },
            height: 100,
            width: 100,
            capacity: 400,
            layers: [],
        };
    }

    validate(value: AttrLayered): ValidateResult<AttrLayered> {
        return { type: 'valid', value };
    }

    async actions({ item, attr }: AttributeInvoke<AttrLayered>, pool: ItemPool, event: ItemMouseEvent, ctx: ActionContext): Promise<void> {
        const { states } = this.game.item;
        if (states.held !== item.id) return;
        const last = attr.layers.at(-1);
        const isInEdit = this.game.states.scene.value.type === 'factory' || this.game.states.scene.value.type === 'kitchen' && !!this.game.states.scene.value.editMode;
        if (last && (!attr.pour?.infinite || isInEdit)) {
            ctx.actions.push({
                title: `${last.name}を捨てる`,
                id: `layered-drop-${item.id}`,
                priority: item.pool === 'fridge' ? 200 - 10 : 200 - 10,
                invoke: async () => {
                    attr.layers.pop();
                    this.game.item.updateItem(item);
                },
            });
        }
        if (!attr.pour) return;
        const { pour } = attr;
        pour.target = undefined;
        const transform = this.game.item.getWorldTransform(item);
        const worldPoint = transform.xform(pour.point);
        const hitId = await this.game.item.raycast(pool, worldPoint, [item.id]);
        if (!hitId) return;
        const hitItem = this.game.item.get(hitId);
        if (!hitItem) return;
        if (!hitItem.attrs.layered) return;
        console.log(hitItem);
        const targetLayered = hitItem.attrs.layered;
        const sourceLayers = attr.layers;
        const pourVolume = pour.volume;
        pour.target = hitId;
        targetLayered.pourSource = item.id;
        const targetCapacityLeft = targetLayered.capacity - targetLayered.layers.reduce((sum, layer) => sum += layer.volume, 0);
        const isFull = targetCapacityLeft <= 0;
        ctx.actions.push({
            title: isFull ? `${hitItem.name}はいっぱいです` : `${hitItem.name}に注ぐ`,
            id: `layered-pour-${item.id}`,
            priority: item.pool === 'fridge' ? 500 : 300,
            invoke: async () => {
                this.pour(targetLayered, sourceLayers, pourVolume, pour.infinite);
                this.game.item.updateItem(item);
                this.game.item.updateItem(hitItem);
                const lastLayer = sourceLayers.at(-1);
                if (!isFull && lastLayer?.pourSound) {
                    this.game.audio.start(lastLayer.pourSound);
                }
            },
        });
    }

    private pour(target: AttrLayered, source: Layer[], volume: number, infinite: boolean) {
        const lastLayer = source.pop();
        if (!lastLayer) return;
        const targetLastLayer = target.layers.at(-1);
        const add = targetLastLayer && this.isLayerKindEqual(targetLastLayer, lastLayer);
        const targetCapacityLeft = target.capacity - target.layers.reduce((sum, layer) => sum += layer.volume, 0);
        const subVolume = Math.min(lastLayer.volume, volume, targetCapacityLeft);
        if (add) {
            if (!infinite) {
                lastLayer.volume -= subVolume;
            }
            targetLastLayer.volume += subVolume;
        } else {
            const clone = this.clone(lastLayer);
            clone.volume = subVolume;
            target.layers.push(clone);
        }
        if (infinite || lastLayer.volume >= volume) {
            source.push(lastLayer);
        }
    }

    private isLayerKindEqual(layerA: Layer, layerB: Layer): boolean {
        if (layerA.type !== layerB.type) return false;
        if (layerA.name !== layerB.name) return false;
        if (getAssetKey(layerA.side.asset) !== getAssetKey(layerB.side.asset)) return false;
        if (getAssetKey(layerA.top.asset) !== getAssetKey(layerB.top.asset)) return false;
        return true;
    }

    private clone(layer: Layer): Layer {
        return {
            ...layer,
        };
    }

    async renderOverlayPost({ item, attr }: AttributeInvoke<AttrLayered>, _pool: ItemPool, render: ItemRender): Promise<void> {
        const { matrices, draw } = this.game.pipeline;
        const { states } = this.game.item;

        const sourceItem = attr.pourSource && states.held === attr.pourSource ? this.game.item.get(attr.pourSource) : undefined;
        if (sourceItem && sourceItem.attrs.layered?.pour?.target === item.id) {
            const width = 6;
            const { min, max } = render.renderBounds;
            const { texture } = render;
            draw.textureOutline(min.x, min.y, max.x, max.y, texture, PALETTE_RGB.TOOLTIP_TEXT, width);
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
            const { point } = pour;
            draw.circle(point.x, point.y, 0, 10, Vec4.ONE);
        }
    }

    async renderPost({ attr }: AttributeInvoke<AttrLayered>, render: ItemRender): Promise<void> {
        const { mask } = attr;
        if (!mask) {
            await this.renderLayers(attr);
            return;
        }
        const { draw, context } = this.game.pipeline;
        const { gl } = context;

        this.maskTexture.use(() => {
            this.maskTexture.ensureSize(render.renderBounds.width, render.renderBounds.height);
        });
        await this.maskBuffer.useAsync(async () => {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            await this.game.renderer.drawAssetTransform(mask);
        });

        this.layerTexture.use(() => {
            this.layerTexture.ensureSize(render.renderBounds.width, render.renderBounds.height);
        });
        await this.layerBuffer.useAsync(async () => {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            await this.renderLayers(attr);
        });

        draw.textureMask(...render.renderBounds.toArray(), this.layerTexture, this.maskTexture);
    }

    private async renderLayers(attr: AttrLayered) {
        const { draw } = this.game.pipeline;
        const { capacity, width } = attr;
        const left = width / -2 + attr.positionX;
        const right = width / 2 + attr.positionX;
        const getT = (volume: number) => {
            return clamp(volume / capacity, 0, 1);
        };
        const getY = (t: number) => {
            return lerp(attr.positionY, attr.positionY - attr.height, t);
        };
        const getCurvature = (t: number) => {
            return lerp(attr.curvature.bottom, attr.curvature.top, t);
        };
        let total = 0;
        for (let index = 0; index < attr.layers.length; index++) {
            const layer = attr.layers[index];
            const last = index === attr.layers.length - 1;
            const bottomT = getT(total);
            const bottomY = getY(bottomT);
            const bottomC = getCurvature(bottomT);
            total += layer.volume;
            const topT = getT(total);
            const topY = getY(topT);
            const topC = getCurvature(topT);
            const side = await this.game.asset.getTexture(layer.side.asset).promise;
            const top = await this.game.asset.getTexture(layer.top.asset).promise;
            if (side.type === 'error') {
                continue;
            }
            if (top.type === 'error') {
                continue;
            }
            const sideTex = side.data.texture;
            const topTex = top.data.texture;
            const bounds = new AABB2(
                new Vec2(left, topY - topC),
                new Vec2(right, bottomY),
            );
            draw.textureCurved(bounds, sideTex, undefined, -topC, bottomC);
            if (last || layer.type === 'solid') {
                const topBounds = new AABB2(
                    new Vec2(left, topY - topC * 2),
                    new Vec2(right, topY),
                );
                draw.textureCurved(topBounds, topTex, undefined, topC, topC);
            }
        }
    }

    async bounds({ attr }: AttributeInvoke<AttrLayered>, ctx: CalculateBoundsContext): Promise<void> {
        const totalVolume = attr.layers.reduce((sum, layer) => sum += layer.volume, 0);
        const t = totalVolume / attr.capacity;
        const topC = lerp01(attr.curvature.bottom, attr.curvature.top, t);
        const halfWidth = attr.width;
        const bounds = new AABB2(
            new Vec2(-halfWidth, lerp01(attr.positionY, attr.positionY - attr.height, t) - topC * 2),
            new Vec2(halfWidth, attr.positionY),
        );
        ctx.render = ctx.render.union(bounds);
    }
}
