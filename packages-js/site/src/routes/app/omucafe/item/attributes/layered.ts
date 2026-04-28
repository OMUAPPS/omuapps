import type { GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext';
import { AABB2 } from '$lib/math/aabb2';
import { clamp, lerp, lerp01 } from '$lib/math/math';
import { Vec2 } from '$lib/math/vec2';
import { Vec4 } from '$lib/math/vec4';
import type { Asset } from '../../core/asset';
import type { Game } from '../../core/game';
import type { AssetTransform } from '../../core/game-renderer';
import { type ValidateResult } from '../../core/helper';
import { getTransform } from '../../core/transform';
import type { AttributeHandler, AttributeInvoke, CalculateBoundsContext, ItemRender } from '../attribute-handler';
import LayeredEditor from './LayeredEditor.svelte';

export interface LayerSolid {
    type: 'solid';
    name: string;
    side: {
        asset: Asset;
    };
    top: {
        asset: Asset;
    };
    volume: number;
}

export interface LayerLiquid {
    type: 'liquid';
    name: string;
    side: {
        asset: Asset;
    };
    top: {
        asset: Asset;
    };
    volume: number;
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

    /** * コンテナ自体のカバーやデバッグ情報の描画
         */
    async renderOverlayPost({ item, attr }: AttributeInvoke<AttrLayered>): Promise<void> {
        const { matrices, draw } = this.game.pipeline;
        const scene = this.game.states.scene.value;

        const { mask } = attr;
        if (mask && scene.type === 'factory' && scene.selecting?.type === 'edit_item' && scene.selecting.itemId === item.id) {
            const textureState = this.game.asset.getTexture(mask.asset);
            if (textureState.type !== 'ready') return;
            const tex = textureState.data.texture;
            const halfSize = new Vec2(tex.width / 2, tex.height / 2);

            // 中心基準の描画範囲
            const bounds = new AABB2(halfSize.scale(-1), halfSize);
            const mat = getTransform(mask.transform).getMat4();

            matrices.model.scope(() => {
                matrices.model.multiply(mat);
                draw.texture(...bounds.toArray(), tex, Vec4.ONE.with({ w: 0.2 }));
            });
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
        // for (const layer of attr.layers) {
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
