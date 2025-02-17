import type { GlBuffer, GlContext, GlFramebuffer, GlProgram, GlTexture } from '$lib/components/canvas/glcontext.js';
import { Mat4 } from '$lib/math/mat4.js';
import type { MatrixStack } from '$lib/math/matrix-stack.js';
import type { Avatar, AvatarAction, AvatarContext, RenderOptions } from './avatar.js';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders.js';

type TextureSource = {
    image: TexImageSource;
    width: number;
    height: number;
}

type TextureMesh = {
    vertices: GlBuffer;
    texCoords: GlBuffer;
    texture: GlTexture;
    source: TextureSource;
}

export class PNGAvatar implements Avatar {
    public base: TextureMesh;
    public active?: TextureMesh;
    public deafened?: TextureMesh;
    public muted?: TextureMesh;
    private readonly frameBufferTexture: GlTexture;
    private readonly frameBuffer: GlFramebuffer;
    private readonly effectTargetTexture: GlTexture;
    private readonly effectTargetFrameBuffer: GlFramebuffer;
    private readonly vertexBuffer: GlBuffer;
    private readonly texcoordBuffer: GlBuffer;
    
    constructor(
        private readonly glContext: GlContext,
        public program: GlProgram,
        public baseTexture: TextureSource,
        public activeTexture?: TextureSource | undefined,
        public deafenedTexture?: TextureSource | undefined,
        public mutedTexture?: TextureSource | undefined,
    ) {
        this.base = PNGAvatar.createTextureMesh(glContext, baseTexture);
        this.active = activeTexture ? PNGAvatar.createTextureMesh(glContext, activeTexture) : this.base;
        this.deafened = deafenedTexture ? PNGAvatar.createTextureMesh(glContext, deafenedTexture) : this.base;
        this.muted = mutedTexture ? PNGAvatar.createTextureMesh(glContext, mutedTexture) : this.base;
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
        base: TextureSource;
        active?: TextureSource;
        deafened?: TextureSource;
        muted?: TextureSource;
    }): Promise<PNGAvatar> {
        const vertexShader = context.createShader({type: 'vertex', source: VERTEX_SHADER});
        const fragmentShader = context.createShader({type: 'fragment', source: FRAGMENT_SHADER});
        const program = context.createProgram([vertexShader, fragmentShader]);
        return new PNGAvatar(
            context,
            program,
            options.base,
            options.active,
            options.deafened,
            options.muted,
        );
    }

    private static createTextureMesh(context: GlContext, source: TextureSource): TextureMesh {
        const texture = context.createTexture();
        texture.use(() => {
            texture.setParams({
                minFilter: 'linear',
                magFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
            texture.setImage(source.image, {
                internalFormat: 'rgba',
                width: source.width,
                height: source.height,
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
        return {vertices, texCoords, texture, source};
    }

    private updateTextureMesh(mesh: TextureMesh) {
        mesh.texture.use(() => {
            const { source } = mesh
            mesh.texture.setImage(source.image, {
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
        return { render };
    }
}
