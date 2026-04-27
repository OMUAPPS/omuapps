import { AABB2 } from '$lib/math/aabb2';
import { clamp, lerp } from '$lib/math/math';
import { Vec2 } from '$lib/math/vec2';
import type { Asset } from '../../core/asset';
import type { Game } from '../../core/game';
import type { AssetTransform } from '../../core/game-renderer';
import { type ValidateResult } from '../../core/helper';
import type { AttributeHandler, AttributeInvoke } from '../attribute-handler';
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

    constructor(private readonly game: Game) {}

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

    async renderPost({ attr }: AttributeInvoke<AttrLayered>): Promise<void> {
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
}
