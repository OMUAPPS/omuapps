import type { GlFramebuffer, GlProgram, GlTexture, ShaderSource } from '$lib/components/canvas/glcontext.js';
import type { AABB2 } from '$lib/math/aabb2.js';
import { invLerp, lerp } from '$lib/math/math.js';
import type { Vec2Like } from '$lib/math/vec2.js';
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
    transform: Transform,
    density?: number,
    mask?: {
        asset: Asset,
        transform: Transform,
    },
    curvature?: {
        in: number,
        out: number,
    },
    liquidEscape?: {
        type: 'dripping',
        point: Vec2Like,
    },
    spawn?: object,
}

export function createLiquid(): Liquid {
    return {
        layers: [],
        transform: createTransform(),
    };
}

const LIQUID_SIDE_FRAGMENT: ShaderSource = {
    type: 'fragment',
    source: `#version 300 es

precision highp float;

uniform sampler2D u_texture;
uniform float u_curvatureIn;
uniform float u_curvatureOut;
uniform vec2 u_resolution;
uniform vec2 u_dimentions;

in vec2 v_texcoord;

out vec4 fragColor;

void main() {
    vec2 uv = v_texcoord;
    float squaredDistanceFromCenter = pow(1.0 - uv.x * 2.0, 2.0);
    vec2 texelPos = uv * u_dimentions;
    vec2 upShiftedPos = vec2(texelPos.x, texelPos.y + (1.0 - squaredDistanceFromCenter) * u_curvatureIn);
    vec2 downShiftedPos = vec2(texelPos.x, texelPos.y - squaredDistanceFromCenter * u_curvatureOut);
    if (upShiftedPos.y < 0.0 || upShiftedPos.y > u_dimentions.y) {
        discard;
    }
    if (downShiftedPos.y < 0.0 || downShiftedPos.y > u_dimentions.y) {
        discard;
    }
    uv = upShiftedPos / u_resolution;
    uv = fract(uv);
    fragColor = texture(u_texture, uv);
}
`}

const LIQUID_TOP_FRAGMENT: ShaderSource = {
    type: 'fragment',
    source: `#version 300 es

precision highp float;

uniform sampler2D u_texture;
uniform float u_curvatureOut;
uniform float u_curvatureIn;
uniform vec2 u_resolution;
uniform vec2 u_dimentions;

in vec2 v_texcoord;

out vec4 fragColor;

void main() {
    vec2 uv = v_texcoord;
    float squaredDistanceFromCenter = pow(1.0 - uv.x * 2.0, 2.0);
    vec2 texelPos = uv * u_dimentions;
    vec2 upShiftedPos = vec2(texelPos.x, texelPos.y + squaredDistanceFromCenter * u_curvatureIn);
    vec2 downShiftedPos = vec2(texelPos.x, texelPos.y - squaredDistanceFromCenter * u_curvatureOut);
    if (upShiftedPos.y < 0.0 || upShiftedPos.y > u_dimentions.y) {
        // fragColor = vec4(1.0,0.0,0.0,1.0);
        // return;
        discard;
    }
    if (downShiftedPos.y < 0.0 || downShiftedPos.y > u_dimentions.y) {
        // fragColor = vec4(0.0,1.0,0.0,1.0);
        // return;
        discard;
    }
    uv = downShiftedPos / u_resolution;
    uv = fract(uv);
    fragColor = texture(u_texture, uv);
}
`}

export class LiquidHandler implements BehaviorHandler<'liquid'> {
    private readonly childrenBuffer: GlFramebuffer;
    private readonly childrenBufferTexture: GlTexture;
    private readonly maskBuffer: GlFramebuffer;
    private readonly maskBufferTexture: GlTexture;
    private readonly liquidSideProgram: GlProgram;
    private readonly liquidTopProgram: GlProgram;
    
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
        const liquidSideFragment = glContext.createShader(LIQUID_SIDE_FRAGMENT);
        this.liquidSideProgram = glContext.createProgram([draw.vertexShader, liquidSideFragment]);
        const liquidTopFragment = glContext.createShader(LIQUID_TOP_FRAGMENT);
        this.liquidTopProgram = glContext.createProgram([draw.vertexShader, liquidTopFragment]);
    }

    async renderPre(action: BehaviorAction<'liquid'>, args: { bufferBounds: AABB2; childRenders: Record<string, ItemRender>; }): Promise<void> {
        const { item, behavior } = action;
        const { bufferBounds } = args;
        if (behavior.layers.length === 0) return;
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
            const transform = transformToMatrix(behavior.transform);
            matrices.model.push();
            matrices.model.multiply(transform);
            const { layers, curvature } = behavior;
            if (!layers.length) return;
            const { bounds } = item;
            const factor = 1 / (behavior.density || 1);
            const sumAmount = factor * layers.reduce((sum, layer) => sum + layer.amount, 0);
            const curvatureTop = curvature?.in ?? 0;
            const curvatureBottom = curvature?.out ?? 0;
            const curvatureAt = (y: number) => lerp(curvatureTop, curvatureBottom, invLerp(bounds.min.y, bounds.max.y, y));
            const liquidTopY = bounds.max.y - sumAmount;
            const layersFromTop = layers.toReversed();

            // Render top layer
            const { side, top: topAsset } = layersFromTop[0];
            const { tex: topTex } = await getTextureByAsset(topAsset ?? side);
            const left = bounds.min.x;
            const right = bounds.max.x;
            const top = liquidTopY;
            const bottom = liquidTopY;
            this.#renderLayerTop(left, top - curvatureAt(top) * 2, right, bottom, topTex, curvatureAt(top), curvatureAt(bottom));

            // Render side layers
            let offset = 0;
            for (const layer of layersFromTop) {
                const { side, amount } = layer;
                const { tex: sideTex } = await getTextureByAsset(side);
                const top = liquidTopY + offset;
                const bottom = top + amount * factor;
                this.#renderLayerSide(left, top - curvatureAt(top), right, bottom, sideTex, curvatureAt(top), curvatureAt(bottom));
                offset += amount * factor;
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

    #renderLayerSide(left: number, top: number, right: number, bottom: number, sideTex: GlTexture, curvatureIn: number, curvatureOut: number) {
        sideTex.use(() => {
            sideTex.setParams({
                wrapS: 'repeat',
                wrapT: 'repeat',
            });
        });
        this.liquidSideProgram.use(() => {
            draw.setMesh(this.liquidSideProgram, new Float32Array([
                left, top, 0,
                right, top, 0,
                right, bottom, 0,
                left, top, 0,
                right, bottom, 0,
                left, bottom, 0,
            ]), new Float32Array([
                0, 1,
                1, 1,
                1, 0,
                0, 1,
                1, 0,
                0, 0,
            ]));
            draw.setMatrices(this.liquidSideProgram);
            this.liquidSideProgram.getUniform('u_texture').asSampler2D().set(sideTex);
            this.liquidSideProgram.getUniform('u_curvatureIn').asFloat().set(curvatureIn);
            this.liquidSideProgram.getUniform('u_curvatureOut').asFloat().set(curvatureOut);
            this.liquidSideProgram.getUniform('u_resolution').asVec2().set({ x: sideTex.width, y: sideTex.height });
            this.liquidSideProgram.getUniform('u_dimentions').asVec2().set({ x: right - left, y: bottom - top });
            glContext.gl.drawArrays(glContext.gl.TRIANGLES, 0, 6);
        });
        sideTex.use(() => {
            sideTex.setParams({
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
        });
    }

    #renderLayerTop(left: number, top: number, right: number, bottom: number, sideTex: GlTexture, curvatureIn: number, curvatureOut: number) {
        sideTex.use(() => {
            sideTex.setParams({
                wrapS: 'repeat',
                wrapT: 'repeat',
            });
        });
        this.liquidTopProgram.use(() => {
            draw.setMesh(this.liquidTopProgram, new Float32Array([
                left, top, 0,
                right, top, 0,
                right, bottom, 0,
                left, top, 0,
                right, bottom, 0,
                left, bottom, 0,
            ]), new Float32Array([
                0, 1,
                1, 1,
                1, 0,
                0, 1,
                1, 0,
                0, 0,
            ]));
            draw.setMatrices(this.liquidTopProgram);
            this.liquidTopProgram.getUniform('u_texture').asSampler2D().set(sideTex);
            this.liquidTopProgram.getUniform('u_curvatureIn').asFloat().set(curvatureIn);
            this.liquidTopProgram.getUniform('u_curvatureOut').asFloat().set(curvatureOut);
            this.liquidTopProgram.getUniform('u_resolution').asVec2().set({ x: sideTex.width, y: sideTex.height });
            this.liquidTopProgram.getUniform('u_dimentions').asVec2().set({ x: right - left, y: bottom - top });
            glContext.gl.drawArrays(glContext.gl.TRIANGLES, 0, 6);
        });
        sideTex.use(() => {
            sideTex.setParams({
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
        });
    }
};
