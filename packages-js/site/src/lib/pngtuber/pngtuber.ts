import { GlBuffer, GlContext, GlProgram, type GlTexture } from '$lib/components/canvas/glcontext.js';
import { Mth } from '$lib/math.js';
import { Mat4 } from '$lib/math/mat4.js';
import { Vec2 } from '$lib/math/vec2.js';
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
    const t = Mth.clamp01(time / total);
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
    const t = Mth.clamp01(time / BOUNCE_TIME);
    return Math.pow(2 * t - 1, 2);
}

function calculateDrag(time: number): number {
    // start with easeOutQuart from 0 to 1 and then easeOutElastic from 1 to 0
    const IN_TIME = 200;
    const OUT_TIME = 200;
    const total = IN_TIME + OUT_TIME;
    const t = Mth.clamp01(time / total);
    const a = t < IN_TIME / total
        ? easeOutQuart(t / (IN_TIME / total))
        : 1 - easeInQuart((t - IN_TIME / total) / (OUT_TIME / total));
    return Mth.lerp(1, -1, a);
}

export type AvatarState = {
    time: number;
    talking: boolean;
    talkingTime: number;
    blinking: boolean;
};

export class PNGTuber {
    private readonly program: GlProgram;

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
    }

    public static async load(glContext: GlContext, data: PNGTuberData): Promise<PNGTuber> {
        const layers = new Map<number, Layer>();
        for (const key in data) {
            layers.set(data[key].identification, await Layer.load(glContext, data[key]));
        }
        return new PNGTuber(glContext, layers);
    }

    public render(state: AvatarState) {
        const { gl } = this.glContext;
        const matrix = Mat4.IDENTITY
            .translate(gl.canvas.width / 2, gl.canvas.height / 2, 0)
            .scale(1 / 2);
        this.layers.values().filter(layer => layer.parentId === null).forEach(layer => {
            this.renderLayer(layer, state, matrix);
        });
    }

    private renderLayer(layer: Layer, state: AvatarState, matrix: Mat4) {
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
        let modelMatrix = matrix;
        modelMatrix = modelMatrix.translate(layer.pos.x, layer.pos.y, 0);
        modelMatrix = modelMatrix.translate(layer.xAmp * Math.sin(Mth.toRadians(state.time * layer.xFrq)), layer.yAmp * Math.sin(Mth.toRadians(state.time * layer.yFrq)), 0);
        modelMatrix = modelMatrix.translate(calculateDrag(state.talkingTime) * layer.drag, 0, 0);
        modelMatrix = modelMatrix.rotateZ(Mth.toRadians(Mth.clamp(layer.drag * calculateDrag(state.talkingTime), layer.rLimitMin, layer.rLimitMax)));
        modelMatrix = modelMatrix.rotateZ(Mth.toRadians(Mth.clamp(layer.rotDrag * calculateRotation(state.talkingTime), layer.rLimitMin, layer.rLimitMax)));
        if (layer.parentId === null) {
            modelMatrix = modelMatrix.translate(0, calculateBounce(state.talkingTime) * 50, 0);
        }
    
        this.program.use(() => {
            const textureUniform = this.program.getUniform('u_texture').asSampler2D();
            textureUniform.set(layer.imageData);
            const projection = this.program.getUniform('u_projection').asMat4();
            projection.set(Mat4.orthographic(0, gl.canvas.width, gl.canvas.height, 0, -1, 1));
            const model = this.program.getUniform('u_model').asMat4();
            model.set(modelMatrix
                .translate(layer.offset.x, layer.offset.y, 0)
                .translate(-layer.imageData.width / 2, -layer.imageData.height / 2, 0)
            );
            const view = this.program.getUniform('u_view').asMat4();
            view.set(Mat4.IDENTITY);
            const positionAttribute = this.program.getAttribute('a_position');
            positionAttribute.set(layer.vertexBuffer, 3, gl.FLOAT, false, 0, 0);
            const uvAttribute = this.program.getAttribute('a_texcoord');
            uvAttribute.set(layer.texcoordBuffer, 2, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        })
        this.layers.values().filter(child => child.parentId === layer.identification).forEach(child => {
            this.renderLayer(child, state, modelMatrix);
        });
    }
}
