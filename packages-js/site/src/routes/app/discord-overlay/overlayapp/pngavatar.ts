import type { GlBuffer, GlContext, GlFramebuffer, GlProgram, GlTexture } from '$lib/components/canvas/glcontext.js';
import type { RenderPipeline } from '$lib/components/canvas/pipeline.js';
import { AABB2 } from '$lib/math/aabb2.js';
import { Mat4 } from '$lib/math/mat4.js';
import { Vec2 } from '$lib/math/vec2.js';
import { Timer } from '$lib/timer.js';
import type { Avatar, AvatarAction, AvatarContext, RenderOptions } from './avatar.js';
import { MVP_VERTEX_SHADER, TEXTURE_FRAGMENT_SHADER } from './shaders.js';

type TextureSource = {
    frames: TexImageSource[];
    duration: number;
    width: number;
    height: number;
};

type TextureMesh = {
    texture: GlTexture;
    source: TextureSource;
    createdTime: number;
};

type RenderTarget = {
    framebuffer: GlFramebuffer;
    texture: GlTexture;
};

type QuadGeometry = {
    vertices: GlBuffer;
    texCoords: GlBuffer;
};

function getFileType(source: Uint8Array): string {
    const HEADER_MAP: Record<string, string> = {
        '89504e47': 'image/png',
        '47494638': 'image/gif',
        'ffd8ffe0': 'image/jpeg',
        'ffd8ffe1': 'image/jpeg',
        'ffd8ffe2': 'image/jpeg',
        'ffd8ffe3': 'image/jpeg',
        'ffd8ffe8': 'image/jpeg',
        '52494646': 'image/webp',
    };
    const header = source.slice(0, 4).reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '');
    return HEADER_MAP[header] || 'image/png';
}

async function decodeImageSource(body: Uint8Array): Promise<{ frames: VideoFrame[] | HTMLImageElement[]; width: number; height: number; duration: number }> {
    const type = getFileType(body);
    const blob = new Blob([body.buffer as ArrayBuffer], { type });

    const imgElement = document.createElement('img');
    imgElement.src = URL.createObjectURL(blob);
    await imgElement.decode();

    if ('ImageDecoder' in window) {
        try {
            const imageDecoder = new ImageDecoder({ data: body, type });
            const track = imageDecoder.tracks.selectedTrack;
            if (track && track.frameCount > 1) {
                const frames: VideoFrame[] = [];
                const firstFrame = await imageDecoder.decode({ frameIndex: 0 });
                for (let i = 0; i < track.frameCount; i++) {
                    const { image } = await imageDecoder.decode({ frameIndex: i, completeFramesOnly: true });
                    frames.push(image);
                }
                return {
                    frames,
                    width: imgElement.width,
                    height: imgElement.height,
                    duration: firstFrame.image.duration || 1000 / 30,
                };
            }
        } catch (e) {
            console.warn('ImageDecoder failed or not supported for this file, falling back to static image.', e);
        }
    }

    return {
        frames: [imgElement],
        width: imgElement.width,
        height: imgElement.height,
        duration: 0,
    };
}

function createQuadGeometry(glContext: GlContext): QuadGeometry {
    const vertices = glContext.createBuffer();
    vertices.bind(() => {
        vertices.setData(new Float32Array([
            -1, -1, 0, -1, 1, 0, 1, -1, 0,
            -1, 1, 0, 1, 1, 0, 1, -1, 0,
        ]), 'static');
    });

    const texCoords = glContext.createBuffer();
    texCoords.bind(() => {
        texCoords.setData(new Float32Array([
            0, 0, 0, 1, 1, 0,
            0, 1, 1, 1, 1, 0,
        ]), 'static');
    });

    return { vertices, texCoords };
}

function createRenderTarget(glContext: GlContext): RenderTarget {
    const texture = glContext.createTexture();
    const framebuffer = glContext.createFramebuffer();

    texture.use(() => {
        texture.setParams({
            minFilter: 'linear',
            magFilter: 'linear',
            wrapS: 'clamp-to-edge',
            wrapT: 'clamp-to-edge',
        });
    });

    framebuffer.use(() => {
        framebuffer.attachTexture(texture);
    });

    return { framebuffer, texture };
}

export class PNGAvatar implements Avatar {
    private readonly primaryTarget: RenderTarget;
    private readonly effectTarget: RenderTarget;
    private readonly geometry: QuadGeometry;

    private constructor(
        private readonly pipeline: RenderPipeline,
        public program: GlProgram,
        public base: TextureMesh,
        public active?: TextureMesh,
        public deafened?: TextureMesh,
        public muted?: TextureMesh,
    ) {
        this.primaryTarget = createRenderTarget(pipeline.context);
        this.effectTarget = createRenderTarget(pipeline.context);

        this.geometry = createQuadGeometry(pipeline.context);
    }

    public static async load(pipeline: RenderPipeline, options: {
        base: Uint8Array;
        active?: Uint8Array;
        deafened?: Uint8Array;
        muted?: Uint8Array;
    }): Promise<PNGAvatar> {
        const vertexShader = pipeline.context.createShader({ type: 'vertex', source: MVP_VERTEX_SHADER });
        const fragmentShader = pipeline.context.createShader({ type: 'fragment', source: TEXTURE_FRAGMENT_SHADER });
        const program = pipeline.context.createProgram([vertexShader, fragmentShader]);

        const [base, active, deafened, muted] = await Promise.all([
            PNGAvatar.createTextureMesh(pipeline.context, options.base),
            options.active ? PNGAvatar.createTextureMesh(pipeline.context, options.active) : undefined,
            options.deafened ? PNGAvatar.createTextureMesh(pipeline.context, options.deafened) : undefined,
            options.muted ? PNGAvatar.createTextureMesh(pipeline.context, options.muted) : undefined,
        ]);

        return new PNGAvatar(pipeline, program, base, active || base, deafened || base, muted || base);
    }

    private static async createTextureMesh(context: GlContext, body: Uint8Array): Promise<TextureMesh> {
        const { frames, width, height, duration } = await decodeImageSource(body);

        const texture = context.createTexture();
        texture.use(() => {
            texture.setParams({
                minFilter: 'linear', magFilter: 'linear', wrapS: 'clamp-to-edge', wrapT: 'clamp-to-edge',
            });

            texture.setImage(frames[0], { internalFormat: 'rgba', width, height });
        });

        return {
            texture,
            source: { frames, duration, width, height },
            createdTime: performance.now(),
        };
    }

    private updateTextureAnimation(mesh: TextureMesh) {
        if (mesh.source.frames.length <= 1) return;

        mesh.texture.use(() => {
            const time = performance.now() - mesh.createdTime;

            const frameIndex = Math.floor(time / mesh.source.duration) % mesh.source.frames.length;
            const frame = mesh.source.frames[frameIndex];
            mesh.texture.setImage(frame, {
                internalFormat: 'rgba',
                width: mesh.source.width,
                height: mesh.source.height,
            });
        });
    }

    private getCurrentMesh(action: AvatarAction): TextureMesh {
        if (action.talking && this.active) return this.active;
        if ((action.deaf || action.self_deaf) && this.deafened) return this.deafened;
        if ((action.mute || action.self_mute) && this.muted) return this.muted;
        return this.base;
    }

    public create(): AvatarContext {
        const context = {
            y: 0,
            tickTimer: new Timer(),
            bounceVelocity: 0,
            bounceTick: 0,
        };

        const updatePhysics = (action: AvatarAction) => {
            const ticks = context.tickTimer.tick(1000 / 60);
            for (let tick = 0; tick < ticks; tick++) {
                if (action.talking && context.y >= 0 && context.bounceVelocity === 0) {
                    context.bounceVelocity = 250;
                    context.bounceTick += 1;
                }
                context.bounceVelocity -= 1000 * 0.0166;
                context.y = Math.min(0, context.y - context.bounceVelocity * 0.0166);
                if (!action.talking && context.y >= -1) {
                    context.bounceVelocity = 0;
                }
            }
        };

        const render = (action: AvatarAction, options: RenderOptions) => {
            const { gl } = this.pipeline.context;

            updatePhysics(action);

            [this.primaryTarget, this.effectTarget].forEach(target => {
                target.texture.use(() => target.texture.ensureSize(gl.drawingBufferWidth, gl.drawingBufferHeight));
            });

            const currentMesh = this.getCurrentMesh(action);
            this.updateTextureAnimation(currentMesh);

            this.primaryTarget.framebuffer.use(() => {
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);

                this.drawAvatarSprite(currentMesh, context.y);
            });

            options.effects.forEach(effect => {
                this.effectTarget.framebuffer.use(() => {
                    gl.clearColor(0, 0, 0, 0);
                    gl.clear(gl.COLOR_BUFFER_BIT);
                });

                effect.render(action, this.primaryTarget.texture, this.effectTarget.framebuffer);

                this.primaryTarget.framebuffer.use(() => {
                    gl.clearColor(0, 0, 0, 0);
                    gl.clear(gl.COLOR_BUFFER_BIT);
                    this.program.use(() => {
                        this.drawFullscreenQuad(this.effectTarget.texture);
                    });
                });
            });

            this.program.use(() => {
                this.drawFullscreenQuad(this.primaryTarget.texture);
            });
        };

        return {
            render,
            bounds: () => {
                const { width, height } = this.base.source;
                const targetWidth = 300;
                const ratio = height / width;
                return AABB2.fromPoints([
                    new Vec2(-targetWidth / 2, -targetWidth / 2 * ratio),
                    new Vec2(targetWidth, targetWidth * ratio),
                ]);
            },
            getContactCandidate: () => undefined,
        };
    }

    private drawAvatarSprite(mesh: TextureMesh, bounceY: number) {
        const { width, height } = mesh.source;
        const targetWidth = 300;
        const ratio = height / width;

        this.pipeline.matrices.model.push();
        this.pipeline.matrices.model.translate(0, -bounceY * 0.0166 / 4, 0);
        this.pipeline.draw.texture(
            -targetWidth / 2, -targetWidth / 2 * ratio,
            targetWidth, targetWidth * ratio,
            mesh.texture,
        );
        this.pipeline.matrices.model.pop();
    }

    private drawFullscreenQuad(texture: GlTexture) {
        const { gl } = this.pipeline.context;

        this.program.getUniform('u_texture').asSampler2D().set(texture);
        this.program.getUniform('u_projection').asMat4().set(Mat4.IDENTITY);
        this.program.getUniform('u_model').asMat4().set(Mat4.IDENTITY);
        this.program.getUniform('u_view').asMat4().set(Mat4.IDENTITY);

        this.program.getAttribute('a_position').set(this.geometry.vertices, 3, gl.FLOAT, false, 0, 0);
        this.program.getAttribute('a_texcoord').set(this.geometry.texCoords, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}
