import { Vec2 } from '$lib/math/vec2.js';
import { Vec4 } from '$lib/math/vec4.js';
import type { GlBuffer, GlContext, GlFramebuffer, GlProgram, GlShader, GlTexture } from './glcontext.js';
import type { Matrices } from './matrices.js';

const VERTEX_SHADER = `#version 300 es

precision highp float;

uniform mat4 u_projection;
uniform mat4 u_model;
uniform mat4 u_view;

in vec3 a_position;
in vec2 a_texcoord;

out vec2 v_texcoord;

void main() {
    gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0);

    v_texcoord = a_texcoord;
}
`;

const COLOR_FRAGMENT_SHADER = `#version 300 es

precision highp float;

uniform vec4 u_color;

out vec4 outColor;

void main() {
    outColor = u_color;
}
`;

const TEXTURE_FRAGMENT_SHADER = `#version 300 es

precision highp float;

uniform sampler2D u_texture;
uniform vec4 u_color;

in vec2 v_texcoord;

out vec4 outColor;

void main() {
    outColor = texture(u_texture, v_texcoord) * u_color;
}
`;

const TEXTURE_COLOR_FRAGMENT_SHADER = `#version 300 es

precision highp float;

uniform sampler2D u_texture;
uniform vec4 u_color;

in vec2 v_texcoord;

out vec4 outColor;

void main() {
    outColor = u_color * texture(u_texture, v_texcoord).a;
}
`;

const TEXTURE_OUTLINE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform vec4 u_outlineColor;
uniform vec2 u_resolution;
uniform float u_outlineWidth;

in vec2 v_texcoord;

out vec4 outColor;

void main() {
    vec2 offset = vec2(u_outlineWidth) / u_resolution;
    float alphaLeft = texture(u_texture, v_texcoord + vec2(-offset.x, 0.0)).a;
    float alphaRight = texture(u_texture, v_texcoord + vec2(offset.x, 0.0)).a;
    float alphaTop = texture(u_texture, v_texcoord + vec2(0.0, offset.y)).a;
    float alphaBottom = texture(u_texture, v_texcoord + vec2(0.0, -offset.y)).a;
    float neighborAverage = (alphaLeft + alphaRight + alphaTop + alphaBottom) / 4.0;
    vec4 color = texture(u_texture, v_texcoord);
    float diff = neighborAverage - color.a;
    outColor = u_outlineColor * smoothstep(0.0, 0.1, diff);
}
`;

export class Draw {
    private readonly vertexShader: GlShader;
    private readonly colorProgram: GlProgram;
    private readonly textureProgram: GlProgram;
    private readonly textureColorProgram: GlProgram;
    private readonly textureOutlineProgram: GlProgram;
    private readonly vertexBuffer: GlBuffer;
    private readonly texcoordBuffer: GlBuffer;
    private readonly frameBuffer: GlFramebuffer;
    private readonly frameBufferTexture: GlTexture;

    constructor(
        private readonly matrices: Matrices,
        private readonly glContext: GlContext
    ) {
        this.vertexShader = glContext.createShader({type: 'vertex', source: VERTEX_SHADER});
        this.colorProgram = this.createProgram(COLOR_FRAGMENT_SHADER);
        this.textureProgram = this.createProgram(TEXTURE_FRAGMENT_SHADER);
        this.textureColorProgram = this.createProgram(TEXTURE_COLOR_FRAGMENT_SHADER);
        this.textureOutlineProgram = this.createProgram(TEXTURE_OUTLINE_FRAGMENT_SHADER);
        this.vertexBuffer = glContext.createBuffer();
        this.texcoordBuffer = glContext.createBuffer();
        this.frameBuffer = glContext.createFramebuffer();
        this.frameBufferTexture = glContext.createTexture();
    }

    private ensureFrameBuffer(width: number, height: number): void {
        this.frameBufferTexture.use(() => {
            this.frameBufferTexture.ensureSize(width, height);
        });
        
        this.frameBuffer.use(() => {
            this.frameBuffer.attachTexture(this.frameBufferTexture);
        });
    }

    private createProgram(fragmentSource: string): GlProgram {
        const fragmentShader = this.glContext.createShader({type: 'fragment', source: fragmentSource});
        return this.glContext.createProgram([this.vertexShader, fragmentShader]);
    }

    public setMesh(vertices: Float32Array, texcoords: Float32Array): void {
        this.vertexBuffer.bind(() => {
            this.vertexBuffer.setData(vertices, 'static');
        });
        this.texcoordBuffer.bind(() => {
            this.texcoordBuffer.setData(texcoords, 'static');
        });
    }

    public rectangle(left: number, top: number, right: number, bottom: number, color: Vec4): void {
        const { gl } = this.glContext;
        
        this.setMesh(new Float32Array([
            left, top, 0,
            right, top, 0,
            right, bottom, 0,
            left, top, 0,
            right, bottom, 0,
            left, bottom, 0,
        ]), new Float32Array([
            0, 0,
            1, 0,
            1, 1,
            0, 0,
            1, 1,
            0, 1,
        ]));

        this.colorProgram.use(() => {
            this.colorProgram.getUniform('u_projection').asMat4().set(this.matrices.projection.get());
            this.colorProgram.getUniform('u_view').asMat4().set(this.matrices.view.get());
            this.colorProgram.getUniform('u_model').asMat4().set(this.matrices.model.get());
            this.colorProgram.getUniform('u_color').asVec4().set(color);
            
            const position = this.colorProgram.getAttribute('a_position');
            position.set(this.vertexBuffer, 3, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }

    public texture(left: number, top: number, right: number, bottom: number, texture: GlTexture, color = Vec4.ONE): void {
        const { gl } = this.glContext;
        
        this.setMesh(new Float32Array([
            left, top, 0,
            right, top, 0,
            right, bottom, 0,
            left, top, 0,
            right, bottom, 0,
            left, bottom, 0,
        ]), new Float32Array([
            0, 0,
            1, 0,
            1, 1,
            0, 0,
            1, 1,
            0, 1,
        ]));

        this.textureProgram.use(() => {
            this.textureProgram.getUniform('u_projection').asMat4().set(this.matrices.projection.get());
            this.textureProgram.getUniform('u_view').asMat4().set(this.matrices.view.get());
            this.textureProgram.getUniform('u_model').asMat4().set(this.matrices.model.get());
            this.textureProgram.getUniform('u_texture').asSampler2D().set(texture);
            this.textureProgram.getUniform('u_color').asVec4().set(color);

            const position = this.textureProgram.getAttribute('a_position');
            position.set(this.vertexBuffer, 3, gl.FLOAT, false, 0, 0);
            const texcoord = this.textureProgram.getAttribute('a_texcoord');
            texcoord.set(this.texcoordBuffer, 2, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }

    public textureColor(left: number, top: number, right: number, bottom: number, texture: GlTexture, color: Vec4): void {
        const { gl } = this.glContext;
        
        this.setMesh(new Float32Array([
            left, top, 0,
            right, top, 0,
            right, bottom, 0,
            left, top, 0,
            right, bottom, 0,
            left, bottom, 0,
        ]), new Float32Array([
            0, 0,
            1, 0,
            1, 1,
            0, 0,
            1, 1,
            0, 1,
        ]));

        this.textureColorProgram.use(() => {
            this.textureColorProgram.getUniform('u_projection').asMat4().set(this.matrices.projection.get());
            this.textureColorProgram.getUniform('u_view').asMat4().set(this.matrices.view.get());
            this.textureColorProgram.getUniform('u_model').asMat4().set(this.matrices.model.get());
            this.textureColorProgram.getUniform('u_texture').asSampler2D().set(texture);
            this.textureColorProgram.getUniform('u_color').asVec4().set(color);
            
            const position = this.textureColorProgram.getAttribute('a_position');
            position.set(this.vertexBuffer, 3, gl.FLOAT, false, 0, 0);
            const texcoord = this.textureColorProgram.getAttribute('a_texcoord');
            texcoord.set(this.texcoordBuffer, 2, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }

    public textureOutline(left: number, top: number, right: number, bottom: number, texture: GlTexture, color: Vec4, outlineWidth: number): void {
        const { gl } = this.glContext;

        const width = right - left;
        const height = bottom - top;
        const uvMargin = new Vec2(
            outlineWidth / width,
            outlineWidth / height,
        );
        
        this.setMesh(new Float32Array([
            left - outlineWidth, top - outlineWidth, 0,
            left + width + outlineWidth, top - outlineWidth, 0,
            left + width + outlineWidth, bottom + outlineWidth, 0,
            left - outlineWidth, top - outlineWidth, 0,
            left + width + outlineWidth, bottom + outlineWidth, 0,
            left - outlineWidth, bottom + outlineWidth, 0,
        ]), new Float32Array([
            -uvMargin.x, -uvMargin.y,
            1 + uvMargin.x, -uvMargin.y,
            1 + uvMargin.x, 1 + uvMargin.y,
            -uvMargin.x, -uvMargin.y,
            1 + uvMargin.x, 1 + uvMargin.y,
            -uvMargin.x, 1 + uvMargin.y,
        ]));

        this.textureOutlineProgram.use(() => {
            this.textureOutlineProgram.getUniform('u_projection').asMat4().set(this.matrices.projection.get());
            this.textureOutlineProgram.getUniform('u_view').asMat4().set(this.matrices.view.get());
            this.textureOutlineProgram.getUniform('u_model').asMat4().set(this.matrices.model.get());
            this.textureOutlineProgram.getUniform('u_texture').asSampler2D().set(texture);
            this.textureOutlineProgram.getUniform('u_outlineColor').asVec4().set(color);
            this.textureOutlineProgram.getUniform('u_resolution').asVec2().set(new Vec2(right - left, bottom - top));
            const mvp = this.matrices.get();
            this.textureOutlineProgram.getUniform('u_outlineWidth').asFloat().set(outlineWidth / mvp.m00 / gl.canvas.width);
            
            const position = this.textureOutlineProgram.getAttribute('a_position');
            position.set(this.vertexBuffer, 3, gl.FLOAT, false, 0, 0);
            const texcoord = this.textureOutlineProgram.getAttribute('a_texcoord');
            texcoord.set(this.texcoordBuffer, 2, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }
}
