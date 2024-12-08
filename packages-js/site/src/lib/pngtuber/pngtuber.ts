import { GlBuffer, GlContext, GlFramebuffer, GlProgram, type GlTexture } from '$lib/components/canvas/glcontext.js';
import { BetterMath } from '$lib/math.js';
import { AABB2 } from '$lib/math/aabb2.js';
import { Mat4 } from '$lib/math/mat4.js';
import { Node2D } from '$lib/math/node2d.js';
import { PoseStack } from '$lib/math/pose-stack.js';
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
    ) { }

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
                -img.width / 2, -img.height / 2, 0,
                -img.width / 2, img.height / 2, 0,
                img.width / 2, -img.height / 2, 0,
                -img.width / 2, img.height / 2, 0,
                img.width / 2, img.height / 2, 0,
                img.width / 2, -img.height / 2, 0,
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

class SpriteGroup {
    public readonly sprite: Node2D;
    public readonly dragOrigin: Node2D;
    public readonly dragger: Node2D;
    public readonly wob: Node2D;
    public readonly group: Node2D;
    public tick: number = 0;
    public parentSprite: SpriteGroup | null = null;

    constructor(
        public readonly layer: Layer,
        origin: Node2D,
    ) {
        this.group = new Node2D(this.layer.pos, 0, Vec2.ONE, origin);
        this.wob = new Node2D(Vec2.ZERO, 0, Vec2.ONE, this.group);
        this.dragger = new Node2D(this.layer.pos, 0, Vec2.ONE, null);
        this.dragOrigin = new Node2D(Vec2.ZERO, 0, Vec2.ONE, this.wob);
        this.sprite = new Node2D(Vec2.ZERO, 0, Vec2.ONE, this.dragOrigin);
    }

    public setParent(parent: SpriteGroup | null) {
        this.group.parent = null;
        if (!parent) return;
        this.group.parent = parent.sprite
        this.parentSprite = parent;
    }

    public process(state: AvatarState) {
        this.tick += 1;

        const glob = this.dragger.globalPosition;
        this.drag();
        this.wobble();

        const length = glob.y - this.dragger.globalPosition.y;

        this.rotationalDrag(length);
        this.stretch(length);
    }

    private drag() {
        if (this.layer.drag === 0) {
            this.dragger.globalPosition = this.wob.globalPosition;
        } else {
            this.dragger.globalPosition = this.dragger.globalPosition.lerp(this.wob.globalPosition, 1 / this.layer.drag);
            this.dragOrigin.globalPosition = this.dragger.globalPosition;
        }
    }

    private wobble() {
        this.wob.position = new Vec2(
            Math.sin(this.tick * this.layer.xFrq) * this.layer.xAmp,
            Math.sin(this.tick * this.layer.yFrq) * this.layer.yAmp,
        );
    }

    private rotationalDrag(length: number) {
        let yvel = length * this.layer.rotDrag;
        yvel = BetterMath.clamp(yvel, this.layer.rLimitMin, this.layer.rLimitMax);
        this.sprite.rotation = BetterMath.lerpAngle(this.sprite.rotation, BetterMath.toRadians(yvel), 0.25);
    }

    private stretch(length: number) {
        const yvel = length * this.layer.stretchAmount * 0.01;
        const target = new Vec2(1 - yvel, 1 + yvel);
        this.sprite.scale = this.sprite.scale.lerp(target, 0.5);
    }
}

export class PNGTuber {
    private readonly program: GlProgram;
    private readonly frameBufferTexture: GlTexture;
    private readonly frameBuffer: GlFramebuffer;
    private readonly effectTargetTexture: GlTexture;
    private readonly effectTargetFrameBuffer: GlFramebuffer;
    private readonly vertexBuffer: GlBuffer;
    private readonly texcoordBuffer: GlBuffer;
    private readonly spriteGroups: Map<number, SpriteGroup>;
    private readonly origin: Node2D;
    private bounceVelocity: number = 0;
    private bounceTick: number = 0;

    constructor(
        private readonly glContext: GlContext,
        public readonly layers: Map<number, Layer>,
    ) {
        this.spriteGroups = new Map();
        this.origin = new Node2D(Vec2.ZERO, 0, Vec2.ONE, null);
        for (const layer of layers.values()) {
            this.spriteGroups.set(layer.identification, new SpriteGroup(layer, this.origin));
        }
        for (const layer of layers.values()) {
            if (layer.parentId !== null) {
                const parent = this.spriteGroups.get(layer.parentId);
                if (!parent) {
                    throw new Error('Invalid parent');
                }
                this.spriteGroups.get(layer.identification)?.setParent(parent);
            }
        }
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
        
        if (state.talking && this.origin.position.y >= 0 && this.bounceVelocity === 0) {
            this.bounceVelocity = 250;
            this.bounceTick += 1;
        }
        this.bounceVelocity = this.bounceVelocity - 1000 * 0.0166;
        this.origin.position = this.origin.position.add(new Vec2(0, -this.bounceVelocity * 0.0166)).min(Vec2.ZERO);
        if (!state.talking && this.origin.position.y >= -1) {
            this.bounceVelocity = 0;
        }

        [...this.spriteGroups.values()].forEach(sprite => sprite.process(state));
    
        passes.sort((a, b) => a - b);

        this.frameBuffer.use(() => {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            passes.forEach(pass => {
                [...this.spriteGroups.values()].filter(sprite => sprite.layer.parentId === null).forEach(sprite => {
                    poseStack.push();
                    this.renderLayer(poseStack, sprite, state, pass);
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

    private renderLayer(poseStack: PoseStack, sprite: SpriteGroup, state: AvatarState, pass: number) {
        if (sprite.layer.showBlink !== 0) {
            if (state.blinking && sprite.layer.showBlink === 1) {
                return;
            } else if (!state.blinking && sprite.layer.showBlink === 2) {
                return;
            }
        }
        if (sprite.layer.showTalk !== 0) {
            if (state.talking && sprite.layer.showTalk === 1) {
                return;
            } else if (!state.talking && sprite.layer.showTalk === 2) {
                return;
            }
        }
        const { gl } = this.glContext;
        
        if (sprite.layer.zindex === pass) {
            this.program.use(() => {
                const textureUniform = this.program.getUniform('u_texture').asSampler2D();
                textureUniform.set(sprite.layer.imageData);
                const projection = this.program.getUniform('u_projection').asMat4();
                projection.set(Mat4.IDENTITY);
                const model = this.program.getUniform('u_model').asMat4();
                const matrix = sprite.sprite
                    .globalTransform
                    .getMat4()
                    .translate(sprite.layer.offset.x, sprite.layer.offset.y, 0);
                model.set(matrix);
                const view = this.program.getUniform('u_view').asMat4();
                view.set(poseStack.get());
                const positionAttribute = this.program.getAttribute('a_position');
                positionAttribute.set(sprite.layer.vertexBuffer, 3, gl.FLOAT, false, 0, 0);
                const uvAttribute = this.program.getAttribute('a_texcoord');
                uvAttribute.set(sprite.layer.texcoordBuffer, 2, gl.FLOAT, false, 0, 0);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            })
        }
        [...this.spriteGroups.values()].filter(child => child.layer.parentId === sprite.layer.identification).forEach(child => {
            this.renderLayer(poseStack, child, state, pass);
        });
    }

    public getBoundingBox(): AABB2 {
        const points: Vec2[] = [];
        for (const sprite of this.spriteGroups.values()) {
            const transform = sprite.sprite.globalTransform;
            const { width, height } = sprite.layer.imageData;
            const halfWidth = width / 2;
            const halfHeight = height / 2;
            const corners = [
                new Vec2(-halfWidth, -halfHeight),
                new Vec2(-halfWidth, halfHeight),
                new Vec2(halfWidth, -halfHeight),
                new Vec2(halfWidth, halfHeight),
            ];
            for (const corner of corners) {
                points.push(transform.xform(corner));
            }
        }
        return AABB2.fromPoints(points);
    }
}
