import { GlBuffer, GlContext, GlFramebuffer, GlProgram, type GlTexture } from '$lib/components/canvas/glcontext.js';
import { BetterMath } from '$lib/math.js';
import { AABB3 } from '$lib/math/aabb3.js';
import { Axis } from '$lib/math/axis.js';
import { Mat4 } from '$lib/math/mat4.js';
import type { PoseStack } from '$lib/math/pose-stack.js';
import { Vec2 } from '$lib/math/vec2.js';
import { Vec3 } from '$lib/math/vec3.js';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders.js';

export type LayerData = {
    animSpeed: number;
    clipped: boolean;
    costumeLayers: string;
    drag: number;
    frames: number;
    identification: number;
    ignoreBounce: boolean;
    imageData: string;
    offset: string;
    parentId: number | null;
    path: string;
    pos: string;
    rLimitMax: number;
    rLimitMin: number;
    rotDrag: number;
    showBlink: number;
    showTalk: number;
    stretchAmount: number;
    toggle: string;
    type: string;
    xAmp: number;
    xFrq: number;
    yAmp: number;
    yFrq: number;
    zindex: number;
};

function parseVector2(data: string): Vec2 {
    const regex = /\(([\d. -]+,)*([\d. -]+)\)/gm;
    const match = regex.exec(data);
    if (!match) {
        throw new Error('Invalid vector2');
    }
    const [x, y] = match[0].slice(1, -1).split(',').map(Number);
    return new Vec2(x, y);
}

export type PNGTuberData = Record<string, LayerData>;

export class Layer {
    constructor(
        private readonly glContext: GlContext,
        public readonly vertexBuffer: GlBuffer,
        public readonly texcoordBuffer: GlBuffer,
        public readonly animSpeed: number,
        public readonly clipped: boolean,
        public readonly costumeLayers: number[],
        public readonly drag: number,
        public readonly frames: number,
        public readonly identification: number,
        public readonly ignoreBounce: boolean,
        public readonly imageData: GlTexture,
        public readonly offset: Vec2,
        public readonly parentId: number | null,
        public readonly path: string,
        public readonly pos: Vec2,
        public readonly rLimitMax: number,
        public readonly rLimitMin: number,
        public readonly rotDrag: number,
        public readonly showBlink: number,
        public readonly showTalk: number,
        public readonly stretchAmount: number,
        public readonly toggle: string | null,
        public readonly type: string,
        public readonly xAmp: number,
        public readonly xFrq: number,
        public readonly yAmp: number,
        public readonly yFrq: number,
        public readonly zindex: number,
        public matrix: Mat4 = Mat4.IDENTITY,
    ) {}

    public static async load(glContext: GlContext, data: LayerData): Promise<Layer> {
        const img = new Image();
        img.src = `data:image/png;base64,${data.imageData}`;
        await new Promise<void>(resolve => {
            img.onload = () => resolve();
        });
        const texture = glContext.createTexture();
        texture.use(() => {
            texture.setParams({
                minFilter: 'linear',
                magFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
            texture.setImage(img, {
                format: 'rgba8',
                width: img.width,
                height: img.height,
            });
        })
        const vertexBuffer = glContext.createBuffer();
        vertexBuffer.bind(() => {
            vertexBuffer.setData(new Float32Array([
                0, 0, 0,
                0, img.height, 0,
                img.width, 0, 0,
                0, img.height, 0,
                img.width, img.height, 0,
                img.width, 0, 0,
            ]), 'static');
        });
        const uvBuffer = glContext.createBuffer();
        uvBuffer.bind(() => {
            uvBuffer.setData(new Float32Array([
                0, 0,
                0, 1,
                1, 0,
                0, 1,
                1, 1,
                1, 0,
            ]), 'static');
        });

        const costumeLayers = JSON.parse(data.costumeLayers);
        if (!Array.isArray(costumeLayers)) {
            throw new Error('Invalid costumeLayers');
        }
        const offset = parseVector2(data.offset);
        const pos = parseVector2(data.pos);
        return new Layer(
            glContext,
            vertexBuffer,
            uvBuffer,
            data.animSpeed,
            data.clipped,
            costumeLayers,
            data.drag,
            data.frames,
            data.identification,
            data.ignoreBounce,
            texture,
            offset,
            data.parentId,
            data.path,
            pos,
            data.rLimitMax,
            data.rLimitMin,
            data.rotDrag,
            data.showBlink,
            data.showTalk,
            data.stretchAmount,
            data.toggle,
            data.type,
            data.xAmp,
            data.xFrq,
            data.yAmp,
            data.yFrq,
            data.zindex,
        );
    }
}

function easeOutQuart(x: number): number {
    return 1 - Math.pow(1 - x, 4);
}

function easeInQuart(x: number): number {
    return x * x * x * x;
}

function easeOutElastic(x: number): number {
    const c4 = (2 * Math.PI) / 3;
    
    return x === 0
        ? 0
        : x === 1
            ? 1
            : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
}

function calculateRotation(time: number): number {
    // start with easeOutQuart from 0 to 1 and then easeOutElastic from 1 to 0
    const IN_TIME = 200;
    const OUT_TIME = 2000;
    const total = IN_TIME + OUT_TIME;
    const t = BetterMath.clamp01(time / total);
    const a = t < IN_TIME / total
        ? easeOutQuart(t / (IN_TIME / total))
        : 1 - easeOutElastic((t - IN_TIME / total) / (OUT_TIME / total));
    return a;
}

function calculateBounce(time: number): number {
    // sin bounce 0 to 1 to 0
    // const BOUNCE_TIME = 200;
    // const t = BetterMath.clamp01(time / BOUNCE_TIME);
    // return 1 - Math.sin(t * Math.PI);
    // 1\ -\ \left(2x-1\right)^{2}
    const BOUNCE_TIME = 400;
    const t = BetterMath.clamp01(time / BOUNCE_TIME);
    return Math.pow(2 * t - 1, 2);
}

function calculateDrag(time: number): number {
    // start with easeOutQuart from 0 to 1 and then easeOutElastic from 1 to 0
    const IN_TIME = 200;
    const OUT_TIME = 200;
    const total = IN_TIME + OUT_TIME;
    const t = BetterMath.clamp01(time / total);
    const a = t < IN_TIME / total
        ? easeOutQuart(t / (IN_TIME / total))
        : 1 - easeInQuart((t - IN_TIME / total) / (OUT_TIME / total));
    return BetterMath.lerp(1, -1, a);
}

export type Effect = {
    render: (state: AvatarState, texture: GlTexture, dest: GlFramebuffer) => void;
}

export type AvatarState = {
    time: number;
    talking: boolean;
    talkingTime: number;
    blinking: boolean;
    effects: Effect[];
};

export class PNGTuber {
    private readonly program: GlProgram;
    private readonly frameBufferTexture: GlTexture;
    private readonly frameBuffer: GlFramebuffer;
    private readonly effectTargetTexture: GlTexture;
    private readonly effectTargetFrameBuffer: GlFramebuffer;
    private readonly vertexBuffer: GlBuffer;
    private readonly texcoordBuffer: GlBuffer;
    private projectionMatrix: Mat4 = Mat4.IDENTITY;

    constructor(
        private readonly glContext: GlContext,
        public readonly layers: Map<number, Layer>,
    ) {
        const vShader = glContext.createShader({
            source: VERTEX_SHADER,
            type: 'vertex',
        })
        const fShader = glContext.createShader({
            source: FRAGMENT_SHADER,
            type: 'fragment',
        })
        this.program = glContext.createProgram([vShader, fShader]);
        this.frameBuffer = glContext.createFramebuffer();
        this.frameBufferTexture = glContext.createTexture();
        this.frameBufferTexture.use(() => {
            this.frameBufferTexture.setParams({
                minFilter: 'linear',
                magFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
        });
        this.frameBuffer.use(() => {
            this.frameBuffer.attachTexture(this.frameBufferTexture);
        });
        this.effectTargetTexture = glContext.createTexture();
        this.effectTargetTexture.use(() => {
            this.effectTargetTexture.setParams({
                minFilter: 'linear',
                magFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
        });
        this.effectTargetFrameBuffer = glContext.createFramebuffer();
        this.effectTargetFrameBuffer.use(() => {
            this.effectTargetFrameBuffer.attachTexture(this.effectTargetTexture);
        });
        this.vertexBuffer = this.glContext.createBuffer();
        this.vertexBuffer.bind(() => {
            this.vertexBuffer.setData(new Float32Array([
                -1, -1, 0,
                -1, 1, 0,
                1, -1, 0,
                -1, 1, 0,
                1, 1, 0,
                1, -1, 0,
            ]), 'static');
        });
        this.texcoordBuffer = this.glContext.createBuffer();
        this.texcoordBuffer.bind(() => {
            this.texcoordBuffer.setData(new Float32Array([
                0, 0,
                0, 1,
                1, 0,
                0, 1,
                1, 1,
                1, 0,
            ]), 'static');
        });
    }

    public static async load(glContext: GlContext, data: PNGTuberData): Promise<PNGTuber> {
        const layers = new Map<number, Layer>();
        for (const key in data) {
            layers.set(data[key].identification, await Layer.load(glContext, data[key]));
        }
        return new PNGTuber(glContext, layers);
    }

    public render(poseStack: PoseStack, state: AvatarState) {
        const { gl } = this.glContext;
        const passes = Array.from(new Set([...this.layers.values()].map(layer => layer.zindex)));

        this.frameBufferTexture.use(() => {
            this.frameBufferTexture.ensureSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
        });
        this.effectTargetTexture.use(() => {
            this.effectTargetTexture.ensureSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
        });
        
        [...this.layers.values()].filter(layer => layer.parentId === null).forEach(layer => {
            poseStack.push();
            this.calculateAnimation(layer, state, poseStack);
            poseStack.pop();
        });
    
        passes.sort((a, b) => a - b);

        this.frameBuffer.use(() => {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            passes.forEach(pass => {
                [...this.layers.values()].filter(layer => layer.parentId === null).forEach(layer => {
                    poseStack.push();
                    this.renderLayer(layer, state, pass);
                    poseStack.pop();
                });
            });
        });

        state.effects.forEach(effect => {
            this.effectTargetFrameBuffer.use(() => {
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
            });
            effect.render(state, this.frameBufferTexture, this.effectTargetFrameBuffer);
            this.frameBuffer.use(() => {
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                this.program.use(() => {
                    const textureUniform = this.program.getUniform('u_texture').asSampler2D();
                    textureUniform.set(this.effectTargetTexture);
                    const projection = this.program.getUniform('u_projection').asMat4();
                    projection.set(Mat4.IDENTITY);
                    const model = this.program.getUniform('u_model').asMat4();
                    model.set(Mat4.IDENTITY);
                    const view = this.program.getUniform('u_view').asMat4();
                    view.set(Mat4.IDENTITY);
                    const positionAttribute = this.program.getAttribute('a_position');
                    positionAttribute.set(this.vertexBuffer, 3, gl.FLOAT, false, 0, 0);
                    const uvAttribute = this.program.getAttribute('a_texcoord');
                    uvAttribute.set(this.texcoordBuffer, 2, gl.FLOAT, false, 0, 0);
                    gl.drawArrays(gl.TRIANGLES, 0, 6);
                });
            });
        });

        this.frameBufferTexture.use(() => {
            const { gl } = this.glContext;
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            this.program.use(() => {
                const textureUniform = this.program.getUniform('u_texture').asSampler2D();
                textureUniform.set(this.frameBufferTexture);
                const projection = this.program.getUniform('u_projection').asMat4();
                projection.set(Mat4.IDENTITY);
                const model = this.program.getUniform('u_model').asMat4();
                model.set(Mat4.IDENTITY);
                const view = this.program.getUniform('u_view').asMat4();
                view.set(Mat4.IDENTITY);
                const positionAttribute = this.program.getAttribute('a_position');
                positionAttribute.set(this.vertexBuffer, 3, gl.FLOAT, false, 0, 0);
                const uvAttribute = this.program.getAttribute('a_texcoord');
                uvAttribute.set(this.texcoordBuffer, 2, gl.FLOAT, false, 0, 0);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            })
        });
    }

    private renderLayer(layer: Layer, state: AvatarState, pass: number) {
        if (layer.showBlink !== 0) {
            if (state.blinking && layer.showBlink === 1) {
                return;
            } else if (!state.blinking && layer.showBlink === 2) {
                return;
            }
        }
        if (layer.showTalk !== 0) {
            if (state.talking && layer.showTalk === 1) {
                return;
            } else if (!state.talking && layer.showTalk === 2) {
                return;
            }
        }
        const { gl } = this.glContext;
        
        if (layer.zindex === pass) {
            this.program.use(() => {
                const textureUniform = this.program.getUniform('u_texture').asSampler2D();
                textureUniform.set(layer.imageData);
                const projection = this.program.getUniform('u_projection').asMat4();
                projection.set(Mat4.IDENTITY);
                const model = this.program.getUniform('u_model').asMat4();
                model.set(layer.matrix);
                const view = this.program.getUniform('u_view').asMat4();
                view.set(Mat4.IDENTITY);
                const positionAttribute = this.program.getAttribute('a_position');
                positionAttribute.set(layer.vertexBuffer, 3, gl.FLOAT, false, 0, 0);
                const uvAttribute = this.program.getAttribute('a_texcoord');
                uvAttribute.set(layer.texcoordBuffer, 2, gl.FLOAT, false, 0, 0);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            })
        }
        [...this.layers.values()].filter(child => child.parentId === layer.identification).forEach(child => {
            this.renderLayer(child, state, pass);
        });
    }

    private calculateAnimation(layer: Layer, state: AvatarState, poseStack: PoseStack) {
        if (layer.showBlink !== 0) {
            if (state.blinking && layer.showBlink === 1) {
                return;
            } else if (!state.blinking && layer.showBlink === 2) {
                return;
            }
        }
        if (layer.showTalk !== 0) {
            if (state.talking && layer.showTalk === 1) {
                return;
            } else if (!state.talking && layer.showTalk === 2) {
                return;
            }
        }
        poseStack.translate(layer.pos.x, layer.pos.y, 0);
        const animationX = layer.xAmp * Math.sin(BetterMath.toRadians(state.time * layer.xFrq));
        const animationY = layer.yAmp * Math.sin(BetterMath.toRadians(state.time * layer.yFrq));
        poseStack.translate(animationX, animationY, 0);
        poseStack.translate(calculateDrag(state.talkingTime) * layer.drag, 0, 0);
        poseStack.rotate(Axis.Z_POS.rotateDeg(BetterMath.clamp(layer.drag * calculateDrag(state.talkingTime) , layer.rLimitMin, layer.rLimitMax)));

        const bounceRot = layer.rotDrag * calculateRotation(state.talkingTime) * 2;
        poseStack.rotate(Axis.Z_POS.rotateDeg(BetterMath.clamp(bounceRot, layer.rLimitMin, layer.rLimitMax)));

        if (layer.parentId === null && !layer.ignoreBounce) {
            poseStack.translate(0, calculateBounce(state.talkingTime) * 50, 0);
        }
        
        poseStack.push()
        const animationRot = layer.rotDrag * animationY;
        poseStack.translate(layer.offset.x, layer.offset.y, 0)
        poseStack.rotate(Axis.Z_POS.rotateDeg(BetterMath.clamp(animationRot, layer.rLimitMin, layer.rLimitMax)));
        poseStack.scale(
            1 + Math.sin(BetterMath.toRadians(state.time * 0.25)) * layer.stretchAmount * 0.005,
            1 - Math.sin(BetterMath.toRadians(state.time * 0.25)) * layer.stretchAmount * 0.005,
            1
        );
        poseStack.translate(-layer.offset.x, -layer.offset.y, 0)
        poseStack.translate(layer.offset.x, layer.offset.y, 0)
        poseStack.translate(-layer.imageData.width / 2, -layer.imageData.height / 2, 0)
        layer.matrix = poseStack.get();
        poseStack.pop();
        [...this.layers.values()].filter(child => child.parentId === layer.identification).forEach(child => {
            poseStack.push();
            this.calculateAnimation(child, state, poseStack);
            poseStack.pop();
        });
    }

    public calculateBounds(): AABB3 {
        const points: Vec3[] = [];
        this.layers.forEach(layer => {
            const leftTop = new Vec3(...layer.matrix.transformPoint(0, 0, 0));
            const rightTop = new Vec3(...layer.matrix.transformPoint(layer.imageData.width, 0, 0));
            const leftBottom = new Vec3(...layer.matrix.transformPoint(0, layer.imageData.height, 0));
            const rightBottom = new Vec3(...layer.matrix.transformPoint(layer.imageData.width, layer.imageData.height, 0));
            points.push(leftTop, rightTop, leftBottom, rightBottom);
        });
        return AABB3.fromPoints(points);
    }
}
