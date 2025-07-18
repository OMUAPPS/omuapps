import type { GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext.js';
import type { AABB2 } from '$lib/math/aabb2.js';
import { getTextureByAsset, type Asset } from '../../asset/asset.js';
import { draw, glContext, matrices } from '../../game/game.js';
import { createTransform, transformToMatrix, type Transform } from '../../game/transform.js';
import type { BehaviorAction, BehaviorHandler } from '../behavior.js';
import { type ItemRender } from '../item-state.js';

export type LiquidLayer = {
    side: Asset,
    top?: Asset,
    amount: number,
}

export type Liquid = {
    layers: LiquidLayer[],
    mask?: {
        asset: Asset,
        transform: Transform,
    },
    transform: Transform,
}

export function createLiquid(): Liquid {
    return {
        layers: [],
        transform: createTransform(),
    };
}

export class LiquidHandler implements BehaviorHandler<'liquid'> {
    private readonly childrenBuffer: GlFramebuffer;
    private readonly childrenBufferTexture: GlTexture;
    private readonly maskBuffer: GlFramebuffer;
    private readonly maskBufferTexture: GlTexture;
    
    constructor() {
        const childrenBuffer = glContext.createFramebuffer();
        const childrenBufferTexture = glContext.createTexture();
        childrenBufferTexture.use(() => {
            childrenBufferTexture.setParams({
                minFilter: 'linear',
                magFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
        })
        childrenBuffer.use(() => {
            childrenBuffer.attachTexture(childrenBufferTexture);
        });
        this.childrenBuffer = childrenBuffer;
        this.childrenBufferTexture = childrenBufferTexture;
        const maskBuffer = glContext.createFramebuffer();
        const maskBufferTexture = glContext.createTexture();
        maskBufferTexture.use(() => {
            maskBufferTexture.setParams({
                minFilter: 'linear',
                magFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
        })
        maskBuffer.use(() => {
            maskBuffer.attachTexture(maskBufferTexture);
        });
        this.maskBuffer = maskBuffer;
        this.maskBufferTexture = maskBufferTexture;
    }

    async renderPre(action: BehaviorAction<'liquid'>, args: { bufferBounds: AABB2; childRenders: Record<string, ItemRender>; }): Promise<void> {
        const { item, behavior, context } = action;
        const { bufferBounds, childRenders } = args;
        const dimentions = bufferBounds.dimensions();
        this.childrenBufferTexture.use(() => {
            this.childrenBufferTexture.ensureSize(dimentions.x, dimentions.y);
        });
        const { gl } = glContext;
        await this.childrenBuffer.useAsync(async () => {
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.clearColor(1, 1, 1, 0);
            glContext.stateManager.pushViewport(dimentions);
            matrices.push();
            matrices.identity();
            matrices.projection.orthographic(bufferBounds.min.x, bufferBounds.max.x, bufferBounds.min.y, bufferBounds.max.y, -1, 1);
            let offset = 0;
            const transform = transformToMatrix(behavior.transform);
            matrices.model.push();
            matrices.model.multiply(transform);
            for (const layer of behavior.layers) {
                const { side, amount } = layer;
                const { tex: sideTex } = await getTextureByAsset(side);
                draw.texture(
                    bufferBounds.min.x,
                    bufferBounds.max.y - offset - amount,
                    bufferBounds.max.x,
                    bufferBounds.max.y - offset,
                    sideTex
                );
                offset += amount;
            }
            matrices.model.pop();
            matrices.pop();
            glContext.stateManager.popViewport();
        });
        if (behavior.mask) {
            const { asset } = behavior.mask;
            const transform = transformToMatrix(behavior.mask.transform);
            const { tex, width, height } = await getTextureByAsset(asset);
            this.maskBufferTexture.use(() => {
                this.maskBufferTexture.ensureSize(dimentions.x, dimentions.y);
            });
            this.maskBuffer.use(() => {
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.clearColor(1, 1, 1, 0);
                glContext.stateManager.pushViewport(dimentions);
                matrices.push();
                matrices.identity();
                matrices.projection.orthographic(bufferBounds.min.x, bufferBounds.max.x, bufferBounds.min.y, bufferBounds.max.y, -1, 1);
                matrices.model.multiply(transform);
                draw.texture(0, 0, width, height, tex);
                matrices.pop();
                glContext.stateManager.popViewport();
            });
            draw.textureMask(bufferBounds.min.x, bufferBounds.min.y, bufferBounds.max.x, bufferBounds.max.y, this.childrenBufferTexture, this.maskBufferTexture);
        } else {
            draw.texture(bufferBounds.min.x, bufferBounds.min.y, bufferBounds.max.x, bufferBounds.max.y, this.childrenBufferTexture);
        }
    }
};
