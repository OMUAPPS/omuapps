import { GlBuffer, GlContext, GlFramebuffer, GlProgram, type GlTexture } from '$lib/components/canvas/glcontext.js';
import { BetterMath } from '$lib/math.js';
import { AABB2 } from '$lib/math/aabb2.js';
import { Mat4 } from '$lib/math/mat4.js';
import { MatrixStack } from '$lib/math/matrix-stack.js';
import { Node2D } from '$lib/math/node2d.js';
import { Vec2 } from '$lib/math/vec2.js';
import { Timer } from '$lib/timer.js';
import type { Avatar, AvatarAction, AvatarContext, RenderOptions } from './avatar.js';
import { MVP_VERTEX_SHADER, SPRITE_FRAGMENT_SHADER, TEXTURE_FRAGMENT_SHADER } from './shaders.js';

export type LayerJson = {
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

export type PNGTuberData = Record<string, LayerJson>;

export class LayerData {
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
        public readonly width: number,
        public readonly height: number,
    ) { }

    public static async load(glContext: GlContext, image: HTMLImageElement, data: LayerJson): Promise<LayerData> {
        const texture = glContext.createTexture();
        texture.use(() => {
            texture.setParams({
                minFilter: 'linear',
                magFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
            texture.setImage(image, {
                internalFormat: 'rgba',
                format: 'rgba',
                width: image.width,
                height: image.height,
            });
        })
        const vertexBuffer = glContext.createBuffer();
        vertexBuffer.bind(() => {
            const width = image.width / data.frames;
            const height = image.height;
            vertexBuffer.setData(new Float32Array([
                0, 0, 0,
                0, height, 0,
                width, 0, 0,
                0, height, 0,
                width, height, 0,
                width, 0, 0,
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
            throw new Error(`Invalid costume layers: ${data.costumeLayers}`);
        }
        const offset = parseVector2(data.offset);
        const pos = parseVector2(data.pos);
        return new LayerData(
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
            image.width / data.frames,
            image.height,
        );
    }
}

class SpriteGroup {
    public readonly sprite: Node2D;
    public readonly dragOrigin: Node2D;
    public readonly dragger: Node2D;
    public readonly wob: Node2D;
    public readonly group: Node2D;
    public tick: number = 0;
    public parentSprite: SpriteGroup | null = null;

    constructor(
        public readonly layerData: LayerData,
        origin: Node2D,
    ) {
        this.group = new Node2D(this.layerData.pos, 0, Vec2.ONE, origin);
        this.wob = new Node2D(Vec2.ZERO, 0, Vec2.ONE, this.group);
        this.dragger = new Node2D(this.layerData.pos, 0, Vec2.ONE, null);
        this.dragOrigin = new Node2D(Vec2.ZERO, 0, Vec2.ONE, this.wob);
        this.sprite = new Node2D(Vec2.ZERO, 0, Vec2.ONE, this.dragOrigin);
    }

    public setParent(parent: SpriteGroup | null) {
        this.group.parent = null;
        if (!parent) return;
        this.group.parent = parent.sprite
        this.parentSprite = parent;
    }

    public initialize() {
        this.dragger.globalPosition = this.dragger.globalPosition.lerp(this.wob.globalPosition, 1);
        this.dragOrigin.globalPosition = this.dragger.globalPosition;
        const rotation = BetterMath.clamp(0, this.layerData.rLimitMin, this.layerData.rLimitMax);
        this.sprite.rotation = BetterMath.toRadians(rotation);
        this.sprite.scale = Vec2.ONE;
    }

    public process() {
        this.tick += 1;

        const glob = this.dragger.globalPosition;
        this.drag();
        this.wobble();

        const length = glob.y - this.dragger.globalPosition.y;

        this.rotationalDrag(length);
        this.stretch(length);
    }

    private drag() {
        if (this.layerData.drag === 0) {
            this.dragger.globalPosition = this.wob.globalPosition;
        } else {
            this.dragger.globalPosition = this.dragger.globalPosition.lerp(this.wob.globalPosition, 1 / this.layerData.drag);
            this.dragOrigin.globalPosition = this.dragger.globalPosition;
        }
    }

    private wobble() {
        this.wob.position = new Vec2(
            Math.sin(this.tick * this.layerData.xFrq) * this.layerData.xAmp,
            Math.sin(this.tick * this.layerData.yFrq) * this.layerData.yAmp,
        );
    }

    private rotationalDrag(length: number) {
        let yvel = length * this.layerData.rotDrag;
        yvel = BetterMath.clamp(yvel, this.layerData.rLimitMin, this.layerData.rLimitMax);
        this.sprite.rotation = BetterMath.lerpAngle(this.sprite.rotation, BetterMath.toRadians(yvel), 0.25);
    }

    private stretch(length: number) {
        const yvel = length * this.layerData.stretchAmount * 0.01;
        const target = new Vec2(1 - yvel, 1 + yvel);
        this.sprite.scale = this.sprite.scale.lerp(target, 0.5);
    }
}

interface PNGTuberContext {
    readonly timer: Timer;
    readonly tickTimer: Timer;
    readonly spriteGroups: Map<number, SpriteGroup>;
    readonly origin: Node2D;
    bounceVelocity: number;
    bounceTick: number;
    blinking: boolean;
    talking: boolean;
    layer: number;
}

export class PNGTuber implements Avatar {
    private readonly spriteProgram: GlProgram;
    private readonly bufferProgram: GlProgram;
    private readonly frameBufferTexture: GlTexture;
    private readonly frameBuffer: GlFramebuffer;
    private readonly effectTargetTexture: GlTexture;
    private readonly effectTargetFrameBuffer: GlFramebuffer;
    private readonly vertexBuffer: GlBuffer;
    private readonly texcoordBuffer: GlBuffer;

    public create(): AvatarContext {
        const spriteGroups = new Map<number, SpriteGroup>();
        const origin = new Node2D(Vec2.ZERO, 0, Vec2.ONE, null);
        for (const layer of this.layers.values()) {
            spriteGroups.set(layer.identification, new SpriteGroup(layer, origin));
        }
        for (const layer of this.layers.values()) {
            if (layer.parentId !== null) {
                const parent = spriteGroups.get(layer.parentId);
                if (!parent) {
                    throw new Error('Invalid parent');
                }
                spriteGroups.get(layer.identification)?.setParent(parent);
            }
        }
        for (const sprite of spriteGroups.values()) {
            sprite.initialize();
        }
        const context = {
            timer: new Timer(),
            tickTimer: new Timer(),
            spriteGroups,
            origin,
            bounceVelocity: 0,
            bounceTick: 0,
            blinking: false,
            talking: false,
            layer: 0,
            showOnTalk: 0,
            showOnBlink: 0,
        }
        const render = (matrices: MatrixStack, action: AvatarAction, options: RenderOptions) => this.render(matrices, context, action, options);
        const bounds = () => this.getBoundingBox(context);
        return {
            render,
            bounds,
        };
    }

    constructor(
        private readonly glContext: GlContext,
        public readonly layers: Map<number, LayerData>,
    ) {
        const mvpVertexShader = glContext.createShader({
            source: MVP_VERTEX_SHADER,
            type: 'vertex',
        })
        const spriteFShader = glContext.createShader({
            source: SPRITE_FRAGMENT_SHADER,
            type: 'fragment',
        })
        this.spriteProgram = glContext.createProgram([mvpVertexShader, spriteFShader]);
        const textureFShader = glContext.createShader({
            source: TEXTURE_FRAGMENT_SHADER,
            type: 'fragment',
        })
        this.bufferProgram = glContext.createProgram([mvpVertexShader, textureFShader]);

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
        const values = Object.values(data);
        const images: Record<string, HTMLImageElement> = {};
        await Promise.all(values.map(async (value) => {
            const image = new Image();
            image.src = `data:image/png;base64,${value.imageData}`;
            await new Promise(resolve => {
                // .decode()を並列で使うとエラー吐くから.decode()の代わりに.onloadを使う (https://issues.chromium.org/issues/40792189#comment7)
                image.onload = resolve;
            });
            images[value.identification] = image;
        }));

        const layerData = new Map<number, LayerData>();
        for (const value of values) {
            const image = images[value.identification];
            const layer = await LayerData.load(glContext, image, value);
            layerData.set(value.identification, layer);
        }
        return new PNGTuber(glContext, layerData);
    }

    public render(matrices: MatrixStack, context: PNGTuberContext, action: AvatarAction, options: RenderOptions): void {
        const { gl } = this.glContext;
        const time = context.timer.getElapsedMS() / 500;
        context.blinking = action.self_mute || Math.sin(time) > 0.995;
        context.talking = action.talking;
        context.layer = action.config.pngtuber.layer;

        const ticks = context.tickTimer.tick(1000 / 60);
        for (let i = 0; i < ticks; i++) {
            if (action.talking && context.origin.position.y >= 0 && context.bounceVelocity === 0) {
                context.bounceVelocity = 250;
                context.bounceTick += 1;
            }
            context.bounceVelocity = context.bounceVelocity - 1000 * 0.0166;
            context.origin.position = context.origin.position.add({x: 0, y: -context.bounceVelocity * 0.0166}).min(Vec2.ZERO);
            if (!action.talking && context.origin.position.y >= -1) {
                context.bounceVelocity = 0;
            }

            for (const sprite of context.spriteGroups.values()) {
                sprite.process();
            }
        }

        const passes = Array.from(new Set([...this.layers.values()].map(layer => layer.zindex)));

        this.frameBufferTexture.use(() => {
            this.frameBufferTexture.ensureSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
        });
        this.effectTargetTexture.use(() => {
            this.effectTargetTexture.ensureSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
        });
    
        passes.sort((a, b) => a - b);

        this.frameBuffer.use(() => {
            gl.clearColor(1, 1, 1, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            passes.forEach(pass => {
                [...context.spriteGroups.values()].filter(sprite => sprite.layerData.parentId === null).forEach(sprite => {
                    matrices.push();
                    this.renderLayer(context, matrices, sprite, pass);
                    matrices.pop();
                });
            });
        });

        options.effects.forEach(effect => {
            this.effectTargetFrameBuffer.use(() => {
                gl.clearColor(1, 1, 1, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
            });
            effect.render(action, this.frameBufferTexture, this.effectTargetFrameBuffer);
            this.frameBuffer.use(() => {
                gl.clearColor(1, 1, 1, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                this.bufferProgram.use(() => {
                    const textureUniform = this.bufferProgram.getUniform('u_texture').asSampler2D();
                    textureUniform.set(this.effectTargetTexture);
                    const projection = this.bufferProgram.getUniform('u_projection').asMat4();
                    projection.set(Mat4.IDENTITY);
                    const model = this.bufferProgram.getUniform('u_model').asMat4();
                    model.set(Mat4.IDENTITY);
                    const view = this.bufferProgram.getUniform('u_view').asMat4();
                    view.set(Mat4.IDENTITY);
                    const positionAttribute = this.bufferProgram.getAttribute('a_position');
                    positionAttribute.set(this.vertexBuffer, 3, gl.FLOAT, false, 0, 0);
                    const uvAttribute = this.bufferProgram.getAttribute('a_texcoord');
                    uvAttribute.set(this.texcoordBuffer, 2, gl.FLOAT, false, 0, 0);
                    gl.drawArrays(gl.TRIANGLES, 0, 6);
                });
            });
        });

        this.frameBufferTexture.use(() => {
            this.bufferProgram.use(() => {
                const textureUniform = this.bufferProgram.getUniform('u_texture').asSampler2D();
                textureUniform.set(this.frameBufferTexture);
                const projection = this.bufferProgram.getUniform('u_projection').asMat4();
                projection.set(Mat4.IDENTITY);
                const model = this.bufferProgram.getUniform('u_model').asMat4();
                model.set(Mat4.IDENTITY);
                const view = this.bufferProgram.getUniform('u_view').asMat4();
                view.set(Mat4.IDENTITY);
                const positionAttribute = this.bufferProgram.getAttribute('a_position');
                positionAttribute.set(this.vertexBuffer, 3, gl.FLOAT, false, 0, 0);
                const uvAttribute = this.bufferProgram.getAttribute('a_texcoord');
                uvAttribute.set(this.texcoordBuffer, 2, gl.FLOAT, false, 0, 0);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            })
        });
    }

    private renderLayer(context: PNGTuberContext, matrices: MatrixStack, sprite: SpriteGroup, pass: number) {
        const { layerData } = sprite;
        if (layerData.showBlink !== 0) {
            if (context.blinking && layerData.showBlink === 1) {
                return;
            } else if (!context.blinking && layerData.showBlink === 2) {
                return;
            }
        }
        if (layerData.showTalk !== 0) {
            if (context.talking && layerData.showTalk === 1) {
                return;
            } else if (!context.talking && layerData.showTalk === 2) {
                return;
            }
        }
        if (layerData.costumeLayers[context.layer] !== 1) {
            return;
        }
        const { gl } = this.glContext;
        
        if (layerData.zindex === pass) {
            this.spriteProgram.use(() => {
                const textureUniform = this.spriteProgram.getUniform('u_texture').asSampler2D();
                textureUniform.set(layerData.imageData);
                const projection = this.spriteProgram.getUniform('u_projection').asMat4();
                projection.set(Mat4.IDENTITY);
                const model = this.spriteProgram.getUniform('u_model').asMat4();
                const matrix = sprite.sprite
                    .globalTransform
                    .getMat4()
                    .translate(-layerData.width / 2, -layerData.height / 2, 0)
                    .translate(layerData.offset.x, layerData.offset.y, 0)
                model.set(matrix);
                const view = this.spriteProgram.getUniform('u_view').asMat4();
                view.set(matrices.get());
                const frameCount = this.spriteProgram.getUniform('u_frame_count').asFloat();
                frameCount.set(layerData.frames);
                const frameUniform = this.spriteProgram.getUniform('u_frame').asFloat();
                const elapsed = context.timer.getElapsedMS() / 1000 / 6;
                const frame = Math.floor(elapsed * (layerData.animSpeed + 1)) % layerData.frames;
                frameUniform.set(layerData.frames > 1 ? frame : 0);
                const positionAttribute = this.spriteProgram.getAttribute('a_position');
                positionAttribute.set(layerData.vertexBuffer, 3, gl.FLOAT, false, 0, 0);
                const uvAttribute = this.spriteProgram.getAttribute('a_texcoord');
                uvAttribute.set(layerData.texcoordBuffer, 2, gl.FLOAT, false, 0, 0);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            })
        }
        [...context.spriteGroups.values()].filter(child => child.layerData.parentId === layerData.identification).forEach(child => {
            this.renderLayer(context, matrices, child, pass);
        });
    }

    public getBoundingBox(context: PNGTuberContext): AABB2 {
        const points: Vec2[] = [];
        for (const sprite of context.spriteGroups.values()) {
            const transform = sprite.sprite.globalTransform;
            const { width, height } = sprite.layerData.imageData;
            const halfWidth = width / 2;
            const halfHeight = height / 2;
            const corners = [
                { x: -halfWidth, y: -halfHeight },
                { x: -halfWidth, y: halfHeight },
                { x: halfWidth, y: -halfHeight },
                { x: halfWidth, y: halfHeight },
            ];
            const offset = new Vec2(sprite.layerData.offset.x, sprite.layerData.offset.y);
            for (const corner of corners) {
                points.push(transform.xform(offset.add(corner)));
            }
        }
        return AABB2.fromPoints(points);
    }
}
