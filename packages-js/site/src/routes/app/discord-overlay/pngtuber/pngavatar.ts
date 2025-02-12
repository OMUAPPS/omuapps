import type { GlBuffer, GlContext, GlFramebuffer, GlProgram, GlTexture } from '$lib/components/canvas/glcontext.js';
import { Mat4 } from '$lib/math/mat4.js';
import type { MatrixStack } from '$lib/math/matrix-stack.js';
import { Vec2 } from '$lib/math/vec2.js';
import type { Avatar, AvatarAction, AvatarContext, RenderOptions } from './avatar.js';
import { MVP_VERTEX_SHADER, SPRITE_FRAGMENT_SHADER } from './shaders.js';

type TextureSource = {
    frames: TexImageSource[];
    duration: number;
    width: number;
    height: number;
}

type TextureMesh = {
    vertices: GlBuffer;
    texCoords: GlBuffer;
    texture: GlTexture;
    source: TextureSource;
    createdTime: number;
}

function getFileType(source: Uint8Array): string {
    const HEADER_MAP: Record<string, string | undefined> = {
        '89504e47': 'image/png',
        '47494638': 'image/gif',
        'ffd8ffe0': 'image/jpeg',
        'ffd8ffe1': 'image/jpeg',
        'ffd8ffe2': 'image/jpeg',
        'ffd8ffe3': 'image/jpeg',
        'ffd8ffe8': 'image/jpeg',
        '52494646': 'image/webp',
    }
    const header = source.slice(0, 4).reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '');
    const type = HEADER_MAP[header];
    if (type) {
        return type;
    }
    console.warn(`Unknown file type: ${header}`);
    return 'image/png';
}

async function createImage(source: Uint8Array): Promise<{width: number, height: number, image: HTMLImageElement}> {
    const type = getFileType(source);
    const blob = new Blob([source], {type});
    const url = URL.createObjectURL(blob);
    const image = document.createElement('img');
    image.src = url;
    await image.decode();
    return {
        width: image.width,
        height: image.height,
        image,
    };
}

export class PNGAvatar implements Avatar {
    private readonly frameBufferTexture: GlTexture;
    private readonly frameBuffer: GlFramebuffer;
    private readonly effectTargetTexture: GlTexture;
    private readonly effectTargetFrameBuffer: GlFramebuffer;
    private readonly vertexBuffer: GlBuffer;
    private readonly texcoordBuffer: GlBuffer;
    private readonly frameCounts: number[] = [];
    
    constructor(
        private readonly glContext: GlContext,
        public program: GlProgram,
        public base: TextureMesh,
        public active?: TextureMesh | undefined,
        public deafened?: TextureMesh | undefined,
        public muted?: TextureMesh | undefined,
    ) {
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
    
    public static async load(context: GlContext, options: {
        base: Uint8Array;
        active?: Uint8Array;
        deafened?: Uint8Array;
        muted?: Uint8Array;
    }): Promise<PNGAvatar> {
        const vertexShader = context.createShader({type: 'vertex', source: MVP_VERTEX_SHADER});
        const fragmentShader = context.createShader({type: 'fragment', source: SPRITE_FRAGMENT_SHADER});
        const program = context.createProgram([vertexShader, fragmentShader]);
        const baseMesh = await PNGAvatar.createTextureMesh(context, options.base);
        const activeMesh = options.active ? await PNGAvatar.createTextureMesh(context, options.active) : baseMesh;
        const deafenedMesh = options.deafened ? await PNGAvatar.createTextureMesh(context, options.deafened) : baseMesh;
        const mutedMesh = options.muted ? await PNGAvatar.createTextureMesh(context, options.muted) : baseMesh;
        return new PNGAvatar(
            context,
            program,
            baseMesh,
            activeMesh,
            deafenedMesh,
            mutedMesh,
        );
    }

    private static async createTextureMesh(context: GlContext, body: Uint8Array): Promise<Promise<TextureMesh>> {
        const type = getFileType(body);
        const image = await createImage(body);
        const imageDecoder = new ImageDecoder({
            data: body,
            type: type,
        });
        const frames: VideoFrame[] = [];
        const firstFrame = await imageDecoder.decode();
        const track = imageDecoder.tracks.selectedTrack;
        if (!track) {
            throw new Error('No video track found');
        }
        for (let i = 0; i < track.frameCount; i++) {
            const { image } = await imageDecoder.decode({frameIndex: i, completeFramesOnly: true});
            frames.push(image);
        }
        const texture = context.createTexture();
        texture.use(() => {
            texture.setParams({
                minFilter: 'linear',
                magFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
            texture.setImage(image.image, {
                internalFormat: 'rgba',
                width: image.width,
                height: image.height,
            });
        });
        const vertices = context.createBuffer();
        vertices.bind(() => {
            vertices.setData(new Float32Array([
                0, 0, 0,
                1, 0, 0,
                1, 1, 0,
                0, 0, 0,
                1, 1, 0,
                0, 1, 0,
            ]), 'static');
        });
        const texCoords = context.createBuffer();
        texCoords.bind(() => {
            texCoords.setData(new Float32Array([
                0, 1,
                1, 1,
                1, 0,
                0, 1,
                1, 0,
                0, 0,
            ]), 'static');
        });
        return {
            vertices,
            texCoords,
            texture,
            source: {
                frames: frames,
                duration: firstFrame.image.duration || 1000 / 30,
                width: image.width,
                height: image.height,
            },
            createdTime: performance.now(),
        };
    }

    private updateTextureMesh(mesh: TextureMesh) {
        mesh.texture.use(() => {
            const { source } = mesh
            const time = (performance.now() - mesh.createdTime);
            const fpm = source.duration / 1000;
            const frame = source.frames[Math.floor(time / fpm) % source.frames.length];
            mesh.texture.setImage(frame, {
                internalFormat: 'rgba',
                width: source.width,
                height: source.height,
            });
        });
    }

    private getTextureMesh(action: AvatarAction): TextureMesh {
        if (action.talking && this.active) {
            return this.active;
        } else if (action.deaf || action.self_deaf) {
            return this.deafened || this.base;
        } else if (action.mute || action.self_mute) {
            return this.muted || this.base;
        } else {
            return this.base;
        }
    }
    
    public create(): AvatarContext {
        const context = {
            y: 0,
            bounceVelocity: 0,
            bounceTick: 0,
        };
            
        const render = (matrices: MatrixStack, action: AvatarAction, options: RenderOptions) => {
            const { gl } = this.glContext;

            if (action.talking && context.y >= 0 && context.bounceVelocity === 0) {
                context.bounceVelocity = 250;
                context.bounceTick += 1;
            }
            context.bounceVelocity = context.bounceVelocity - 1000 * 0.0166;
            context.y = Math.min(0, context.y - context.bounceVelocity * 0.0166);
            if (!action.talking && context.y >= -1) {
                context.bounceVelocity = 0;
            }

            this.frameBufferTexture.use(() => {
                this.frameBufferTexture.ensureSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
            });
            this.effectTargetTexture.use(() => {
                this.effectTargetTexture.ensureSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
            });
            
            const textureMesh = this.getTextureMesh(action);
            this.updateTextureMesh(textureMesh);
            this.frameBuffer.use(() => {
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                this.program.use(() => {
                    const textureUniform = this.program.getUniform('u_texture').asSampler2D();
                    textureUniform.set(textureMesh.texture);
                    const projection = this.program.getUniform('u_projection').asMat4();
                    projection.set(Mat4.IDENTITY);
                    const model = this.program.getUniform('u_model').asMat4();
                    const { width, height } = textureMesh.texture;
                    const targetWidth = 126 * 2.5;
                    const widthToHeightRatio = height / width;
                    model.set(Mat4.IDENTITY
                        .translate(-targetWidth / 2, -targetWidth / 2 * widthToHeightRatio, 0)
                        .scale(targetWidth, targetWidth * widthToHeightRatio, 1)
                        .translate(0, -context.y * 0.0166 / 4, 0)
                    );
                    const view = this.program.getUniform('u_view').asMat4();
                    view.set(matrices.get().scale(1, -1, 1));
                    const positionAttribute = this.program.getAttribute('a_position');
                    positionAttribute.set(textureMesh.vertices, 3, gl.FLOAT, false, 0, 0);
                    const uvAttribute = this.program.getAttribute('a_texcoord');
                    uvAttribute.set(textureMesh.texCoords, 2, gl.FLOAT, false, 0, 0);
                    gl.drawArrays(gl.TRIANGLES, 0, 6);
                });
            });
            
            options.effects.forEach(effect => {
                this.effectTargetFrameBuffer.use(() => {
                    gl.clearColor(0, 0, 0, 0);
                    gl.clear(gl.COLOR_BUFFER_BIT);
                });
                effect.render(action, this.frameBufferTexture, this.effectTargetFrameBuffer);
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
        const bounds = () => {
            const { width, height } = this.base.source;
            return {
                min: new Vec2(-126 * 2.5 / 2, -126 * 2.5 / 2 * height / width),
                max: new Vec2(126 * 2.5 / 2, 126 * 2.5 / 2 * height / width),
            };
        }
        return {
            render,
            bounds,
        };
    }
}
