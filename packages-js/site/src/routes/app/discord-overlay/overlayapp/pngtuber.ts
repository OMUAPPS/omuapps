import { GlBuffer, GlContext, GlFramebuffer, GlProgram, type GlTexture } from '$lib/components/canvas/glcontext.js';
import type { RenderPipeline } from '$lib/components/canvas/pipeline.js';
import { BetterMath } from '$lib/math.js';
import { AABB2 } from '$lib/math/aabb2.js';
import { Mat4 } from '$lib/math/mat4.js';
import { Node2D } from '$lib/math/node2d.js';
import type { Transform2D } from '$lib/math/transform2d.js';
import { Vec2 } from '$lib/math/vec2.js';
import { Vec4 } from '$lib/math/vec4.js';
import { Timer } from '$lib/timer.js';
import type { Avatar, AvatarAction, AvatarContext, ContactCandidate, RenderOptions } from './avatar.js';
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

export type PNGTuberData = Record<string, LayerJson>;

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

function parseVector2(data: string): Vec2 {
    const regex = /\(([\d. -]+,)*([\d. -]+)\)/gm;
    const match = regex.exec(data);
    if (!match) throw new Error('Invalid vector2');
    const [x, y] = match[0].slice(1, -1).split(',').map(Number);
    return new Vec2(x, y);
}

function shouldRenderLayer(layerData: LayerData, context: PNGTuberContext): boolean {
    if (layerData.showBlink !== 0) {
        if (context.blinking && layerData.showBlink === 1) return false;
        if (!context.blinking && layerData.showBlink === 2) return false;
    }

    if (layerData.showTalk !== 0) {
        if (context.talking && layerData.showTalk === 1) return false;
        if (!context.talking && layerData.showTalk === 2) return false;
    }

    if (layerData.costumeLayers[context.layer] !== 1) {
        return false;
    }
    return true;
}

function alphaPixelsFromImage(image: HTMLImageElement): number[] {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create canvas context');
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    const alphaPixels: number[] = [];
    for (let i = 0; i < imageData.data.length; i += 4) {
        alphaPixels.push(imageData.data[i + 3]);
    }
    return alphaPixels;
}

export class LayerData {
    constructor(
        public readonly vertexBuffer: GlBuffer,
        public readonly texcoordBuffer: GlBuffer,
        public readonly alphaPixels: number[],
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
        const texture = this.createTexture(glContext, image);
        const vertexBuffer = this.createVertexBuffer(glContext, image.width / data.frames, image.height);
        const uvBuffer = this.createUVBuffer(glContext);

        const costumeLayers = JSON.parse(data.costumeLayers);
        if (!Array.isArray(costumeLayers)) throw new Error(`Invalid costume layers: ${data.costumeLayers}`);

        return new LayerData(
            vertexBuffer,
            uvBuffer,
            alphaPixelsFromImage(image),
            data.animSpeed,
            data.clipped,
            costumeLayers,
            data.drag,
            data.frames,
            data.identification,
            data.ignoreBounce,
            texture,
            parseVector2(data.offset),
            data.parentId,
            data.path,
            parseVector2(data.pos),
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

    private static createTexture(glContext: GlContext, image: HTMLImageElement): GlTexture {
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
        });
        return texture;
    }

    private static createVertexBuffer(glContext: GlContext, width: number, height: number): GlBuffer {
        const buffer = glContext.createBuffer();
        buffer.bind(() => {
            buffer.setData(new Float32Array([
                0, 0, 0,
                0, height, 0,
                width, 0, 0,
                0, height, 0,
                width, height, 0,
                width, 0, 0,
            ]), 'static');
        });
        return buffer;
    }

    private static createUVBuffer(glContext: GlContext): GlBuffer {
        const buffer = glContext.createBuffer();
        buffer.bind(() => {
            buffer.setData(new Float32Array([
                0, 0,
                0, 1,
                1, 0,
                0, 1,
                1, 1,
                1, 0,
            ]), 'static');
        });
        return buffer;
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
        this.group.parent = parent.sprite;
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

export class PNGTuber implements Avatar {
    private readonly spriteProgram: GlProgram;
    private readonly bufferProgram: GlProgram;
    private readonly frameBufferTexture: GlTexture;
    private readonly frameBuffer: GlFramebuffer;
    private readonly effectTargetTexture: GlTexture;
    private readonly effectTargetFrameBuffer: GlFramebuffer;
    private readonly fullscreenVertexBuffer: GlBuffer;
    private readonly fullscreenTexcoordBuffer: GlBuffer;

    constructor(
        private readonly pipeline: RenderPipeline,
        public readonly layers: Map<number, LayerData>,
    ) {
        const { spriteProgram, bufferProgram } = this.createPrograms(pipeline.context);
        this.spriteProgram = spriteProgram;
        this.bufferProgram = bufferProgram;

        const mainFBO = this.createFrameBuffer(pipeline.context);
        this.frameBuffer = mainFBO.framebuffer;
        this.frameBufferTexture = mainFBO.texture;

        const effectFBO = this.createFrameBuffer(pipeline.context);
        this.effectTargetFrameBuffer = effectFBO.framebuffer;
        this.effectTargetTexture = effectFBO.texture;

        this.fullscreenVertexBuffer = this.createFullscreenBuffer(pipeline.context);
        this.fullscreenTexcoordBuffer = LayerData['createUVBuffer'](pipeline.context);
    }

    private createPrograms(glContext: GlContext) {
        const mvpVertexShader = glContext.createShader({ source: MVP_VERTEX_SHADER, type: 'vertex' });
        const spriteFShader = glContext.createShader({ source: SPRITE_FRAGMENT_SHADER, type: 'fragment' });
        const textureFShader = glContext.createShader({ source: TEXTURE_FRAGMENT_SHADER, type: 'fragment' });

        return {
            spriteProgram: glContext.createProgram([mvpVertexShader, spriteFShader]),
            bufferProgram: glContext.createProgram([mvpVertexShader, textureFShader]),
        };
    }

    private createFrameBuffer(glContext: GlContext) {
        const texture = glContext.createTexture();
        texture.use(() => {
            texture.setParams({
                minFilter: 'linear',
                magFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
        });
        const framebuffer = glContext.createFramebuffer();
        framebuffer.use(() => framebuffer.attachTexture(texture));
        return { texture, framebuffer };
    }

    private createFullscreenBuffer(glContext: GlContext): GlBuffer {
        const buffer = glContext.createBuffer();
        buffer.bind(() => {
            buffer.setData(new Float32Array([
                -1, -1, 0, -1, 1, 0, 1, -1, 0,
                -1, 1, 0, 1, 1, 0, 1, -1, 0,
            ]), 'static');
        });
        return buffer;
    }

    public static async load(pipeline: RenderPipeline, data: PNGTuberData): Promise<PNGTuber> {
        const values = Object.values(data);
        const images: Record<string, HTMLImageElement> = {};

        await Promise.all(values.map(async (value) => {
            const image = new Image();
            image.src = `data:image/png;base64,${value.imageData}`;
            await new Promise(resolve => { image.onload = resolve; });
            images[value.identification] = image;
        }));

        const layerData = new Map<number, LayerData>();
        for (const value of values) {
            const layer = await LayerData.load(pipeline.context, images[value.identification], value);
            layerData.set(value.identification, layer);
        }
        return new PNGTuber(pipeline, layerData);
    }

    public create(): AvatarContext {
        const spriteGroups = new Map<number, SpriteGroup>();
        const origin = new Node2D(Vec2.ZERO, 0, Vec2.ONE, null);

        for (const layer of this.layers.values()) {
            spriteGroups.set(layer.identification, new SpriteGroup(layer, origin));
        }
        for (const layer of this.layers.values()) {
            if (layer.parentId !== null) {
                const parent = spriteGroups.get(layer.parentId);
                if (parent) spriteGroups.get(layer.identification)?.setParent(parent);
                else throw new Error('Invalid parent');
            }
        }
        for (const sprite of spriteGroups.values()) {
            sprite.initialize();
        }

        const context: PNGTuberContext = {
            timer: new Timer(),
            tickTimer: new Timer(),
            spriteGroups,
            origin,
            bounceVelocity: 0,
            bounceTick: 0,
            blinking: false,
            talking: false,
            layer: 0,
        };

        return {
            render: (action, options) => this.render(context, action, options),
            bounds: () => this.getBoundingBox(context),
            getContactCandidate: (point) => this.getContactCandidate(context, point),
        };
    }

    public render(context: PNGTuberContext, action: AvatarAction, options: RenderOptions): void {
        this.updateStateAndPhysics(context, action);
        this.ensureBufferSizes();
        this.renderSceneToFrameBuffer(context, options);
        this.applyEffects(action, options);
        this.drawFinalToScreen();
    }

    private updateStateAndPhysics(context: PNGTuberContext, action: AvatarAction) {
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
            context.origin.position = context.origin.position.add({ x: 0, y: -context.bounceVelocity * 0.0166 }).min(Vec2.ZERO);
            if (!action.talking && context.origin.position.y >= -1) {
                context.bounceVelocity = 0;
            }

            for (const sprite of context.spriteGroups.values()) {
                sprite.process();
            }
        }
    }

    private ensureBufferSizes() {
        const { gl } = this.pipeline.context;
        this.frameBufferTexture.use(() => this.frameBufferTexture.ensureSize(gl.drawingBufferWidth, gl.drawingBufferHeight));
        this.effectTargetTexture.use(() => this.effectTargetTexture.ensureSize(gl.drawingBufferWidth, gl.drawingBufferHeight));
    }

    private renderSceneToFrameBuffer(context: PNGTuberContext, options: RenderOptions) {
        const { gl } = this.pipeline.context;
        const passes = Array.from(new Set([...this.layers.values()].map(layer => layer.zindex))).sort((a, b) => a - b);
        const rootSprites = [...context.spriteGroups.entries()].filter(([,sprite]) => sprite.layerData.parentId === null);

        this.frameBuffer.use(() => {
            gl.clearColor(1, 1, 1, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            passes.forEach(pass => {
                rootSprites.forEach(sprite => {
                    this.renderLayerRecursive(context, options, sprite[0], sprite[1], pass);
                });
            });
            for (const object of options.objects) {
                for (const [id, { sprite, layerData }] of context.spriteGroups.entries()) {
                    if (id !== object.attached.target) continue;
                    this.pipeline.matrices.model.push();
                    this.pipeline.matrices.model.multiply(sprite.globalTransform.getMat4());
                    this.pipeline.matrices.model.translate(layerData.offset.x, layerData.offset.y, 0);
                    object.render();
                    this.pipeline.matrices.model.pop();
                }
            }
        });
    }

    private renderLayerRecursive(context: PNGTuberContext, options: RenderOptions, index: number, sprite: SpriteGroup, pass: number) {
        if (!shouldRenderLayer(sprite.layerData, context)) return;

        const { layerData } = sprite;

        if (layerData.zindex === pass) {
            this.renderSingleLayer(sprite, layerData, context);
        }

        const children = [...context.spriteGroups.entries()].filter(([,child]) => child.layerData.parentId === layerData.identification);
        children.forEach(child => this.renderLayerRecursive(context, options, child[0], child[1], pass));
    }

    private renderSingleLayer(sprite: SpriteGroup, layerData: LayerData, context: PNGTuberContext) {
        this.pipeline.matrices.model.push();
        this.pipeline.matrices.model.multiply(sprite.sprite.globalTransform.getMat4());
        this.pipeline.matrices.model.translate(layerData.offset.x, layerData.offset.y, 0);

        const elapsed = context.timer.getElapsedMS() / 1000 / 6;
        const frame = Math.floor(elapsed * (layerData.animSpeed + 1)) % layerData.frames;

        const uvOffsetX = frame / layerData.frames;
        const uvScaleX = 1 / layerData.frames;
        this.pipeline.draw.textureUV(
            -layerData.width / 2, -layerData.height / 2,
            layerData.width / 2, layerData.height / 2,
            layerData.imageData,
            uvOffsetX, 0,
            uvOffsetX + uvScaleX, 1,
        );
        this.pipeline.matrices.model.pop();
    }

    private applyEffects(action: AvatarAction, options: RenderOptions) {
        const { gl } = this.pipeline.context;

        options.effects.forEach(effect => {
            this.effectTargetFrameBuffer.use(() => {
                gl.clearColor(1, 1, 1, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
            });
            effect.render(action, this.frameBufferTexture, this.effectTargetFrameBuffer);

            this.frameBuffer.use(() => {
                gl.clearColor(1, 1, 1, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                this.drawTextureToBuffer(this.effectTargetTexture);
            });
        });
    }

    private drawFinalToScreen() {
        this.frameBufferTexture.use(() => {
            this.drawTextureToBuffer(this.frameBufferTexture);
        });
    }

    private drawTextureToBuffer(texture: GlTexture) {
        const { gl } = this.pipeline.context;
        this.bufferProgram.use(() => {
            this.bufferProgram.getUniform('u_texture').asSampler2D().set(texture);
            this.bufferProgram.getUniform('u_projection').asMat4().set(Mat4.IDENTITY);
            this.bufferProgram.getUniform('u_model').asMat4().set(Mat4.IDENTITY);
            this.bufferProgram.getUniform('u_view').asMat4().set(Mat4.IDENTITY);

            this.bufferProgram.getAttribute('a_position')
                .set(this.fullscreenVertexBuffer, 3, gl.FLOAT, false, 0, 0);
            this.bufferProgram.getAttribute('a_texcoord')
                .set(this.fullscreenTexcoordBuffer, 2, gl.FLOAT, false, 0, 0);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }

    public getBoundingBox(context: PNGTuberContext): AABB2 {
        const points: Vec2[] = [];
        for (const sprite of context.spriteGroups.values()) {
            const transform = sprite.sprite.globalTransform;
            const { width, height } = sprite.layerData.imageData;
            const corners = [
                { x: -width / 2, y: -height / 2 },
                { x: -width / 2, y: height / 2 },
                { x: width / 2, y: -height / 2 },
                { x: width / 2, y: height / 2 },
            ];
            const offset = sprite.layerData.offset;
            corners.forEach(c => points.push(transform.xform(offset.add(c))));
        }
        return AABB2.fromPoints(points);
    }

    public getContactCandidate(context: PNGTuberContext, point: Vec2): ContactCandidate | undefined {
        let topLayer: {
            id: number;
            group: SpriteGroup;
            offset: Vec2;
            transform: Transform2D;
        } | undefined = undefined;
        for (const [id, group] of context.spriteGroups.entries()) {
            const { layerData, sprite } = group;
            if (!shouldRenderLayer(layerData, context)) continue;
            const transform = sprite.globalTransform;
            const { width, height } = layerData.imageData;
            const offset = layerData.offset;

            // bounds check
            const corners = [
                new Vec2(-width / 2, -height / 2),
                new Vec2(-width / 2, height / 2),
                new Vec2(width / 2, height / 2),
                new Vec2(width / 2, -height / 2),
            ].map(c => transform.xform(offset.add(c)));

            const bounds = AABB2.fromPoints(corners);

            if (!bounds.contains(point)) continue;

            // alpha check
            const localPoint = transform.affineInverse().xform(point).sub(offset).add(new Vec2(width / 2, height / 2));
            const x = Math.floor(localPoint.x);
            const y = Math.floor(localPoint.y);
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            const pixelIndex = y * width + x;
            const alpha = layerData.alphaPixels[pixelIndex];
            if (alpha < 10) continue;

            if (!topLayer || layerData.zindex >= topLayer.group.layerData.zindex) {
                topLayer = {
                    id,
                    group,
                    offset: localPoint.sub(new Vec2(width / 2, height / 2)),
                    transform,
                };
            };
        }
        if (topLayer) {
            return {
                attach: (object, matrix, offset) => {
                    return {
                        object,
                        matrix,
                        offset,
                        origin: topLayer.offset,
                        target: topLayer.id,
                    };
                },
                renderHighlight: () => {
                    const { group } = topLayer;
                    const { layerData, sprite } = group;
                    this.pipeline.matrices.model.push();
                    this.pipeline.matrices.model.multiply(sprite.globalTransform.getMat4());
                    this.pipeline.matrices.model.translate(layerData.offset.x, layerData.offset.y, 0);

                    const elapsed = context.timer.getElapsedMS() / 1000 / 6;
                    const frame = Math.floor(elapsed * (layerData.animSpeed + 1)) % layerData.frames;

                    const uvOffsetX = frame / layerData.frames;
                    const uvScaleX = 1 / layerData.frames;
                    this.pipeline.draw.textureOutline(
                        -layerData.width / 2, -layerData.height / 2,
                        layerData.width / 2, layerData.height / 2,
                        layerData.imageData,
                        Vec4.ONE, 8, {
                            left: uvOffsetX, top: 0,
                            right: uvOffsetX + uvScaleX, bottom: 1,
                        },
                    );
                    this.pipeline.matrices.model.pop();
                },
            };
        }
    }
}
