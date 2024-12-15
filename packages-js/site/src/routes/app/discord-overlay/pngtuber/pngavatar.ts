import type { GlBuffer, GlContext, GlProgram, GlTexture } from '$lib/components/canvas/glcontext.js';
import { Mat4 } from '$lib/math/mat4.js';
import type { MatrixStack } from '$lib/math/matrix-stack.js';
import type { Avatar, AvatarAction, AvatarContext, RenderOptions } from './avatar.js';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders.js';

type TextureSource = {
    source: TexImageSource;
    width: number;
    height: number;
}

type TextureMesh = {
    vertices: GlBuffer;
    texCoords: GlBuffer;
    texture: GlTexture;
}

export class PNGAvatar implements Avatar {
    constructor(
        private readonly glContext: GlContext,
        public program: GlProgram,
        public base: TextureMesh,
        public active?: TextureMesh,
        public deafened?: TextureMesh,
        public muted?: TextureMesh,
    ) {}
    
    public static async load(context: GlContext, options: {
        base: TextureSource;
        active?: TextureSource;
        deafened?: TextureSource;
        muted?: TextureSource;
    }): Promise<PNGAvatar> {
        const baseTexture = PNGAvatar.createTextureMesh(context, options.base);
        const activeTexture = options.active ? PNGAvatar.createTextureMesh(context, options.active) : baseTexture;
        const deafenedTexture = options.deafened ? PNGAvatar.createTextureMesh(context, options.deafened) : baseTexture;
        const mutedTexture = options.muted ? PNGAvatar.createTextureMesh(context, options.muted) : baseTexture;
        const vertexShader = context.createShader({type: 'vertex', source: VERTEX_SHADER});
        const fragmentShader = context.createShader({type: 'fragment', source: FRAGMENT_SHADER});
        const program = context.createProgram([vertexShader, fragmentShader]);
        return new PNGAvatar(
            context,
            program,
            baseTexture,
            activeTexture,
            deafenedTexture,
            mutedTexture,
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
            texture.setImage(source.source, {
                format: 'rgba',
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
        return {vertices, texCoords, texture};
    }
    
    public create(): AvatarContext {
        const render = (matrices: MatrixStack, action: AvatarAction, options: RenderOptions) => {
            const { gl } = this.glContext;
            let textureMesh = this.base;
            if ((action.deaf || action.self_deaf) && this.deafened) {
                textureMesh = this.deafened;
            } else if ((action.mute || action.self_mute) && this.muted) {
                textureMesh = this.muted;
            } else if (action.talking && this.active) {
                textureMesh = this.active;
            }
            this.program.use(() => {
                const textureUniform = this.program.getUniform('u_texture').asSampler2D();
                textureUniform.set(textureMesh.texture);
                const projection = this.program.getUniform('u_projection').asMat4();
                projection.set(Mat4.IDENTITY);
                const model = this.program.getUniform('u_model').asMat4();
                const { width, height } = textureMesh.texture;
                model.set(Mat4.IDENTITY
                    .translate(-width / 2, -height / 2, 0)
                    .scale(width, height, 1)
                );
                const view = this.program.getUniform('u_view').asMat4();
                view.set(matrices.get().scale(1, -1, 1));
                const positionAttribute = this.program.getAttribute('a_position');
                positionAttribute.set(textureMesh.vertices, 3, gl.FLOAT, false, 0, 0);
                const uvAttribute = this.program.getAttribute('a_texcoord');
                uvAttribute.set(textureMesh.texCoords, 2, gl.FLOAT, false, 0, 0);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            })
        }
        return { render };
    }
}
