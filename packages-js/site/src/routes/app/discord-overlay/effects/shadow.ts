import type { GlContext, GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext.js';
import { Vec2 } from '$lib/math/vec2.js';
import { Vec4 } from '$lib/math/vec4.js';
import type { AvatarState, Effect } from '$lib/pngtuber/pngtuber.js';

const SHADOW_VERTEX_SHADER = `#version 300 es

precision highp float;

in vec3 a_position;
in vec2 a_texcoord;

out vec2 v_texcoord;

void main() {
    gl_Position = vec4(a_position, 1.0);

    v_texcoord = a_texcoord;
}
`;

const SHADOW_FRAGMENT_SHADER = `#version 300 es

precision highp float;

uniform vec2 u_resolution;
uniform sampler2D u_texture;
uniform vec4 u_color;

in vec2 v_texcoord;

out vec4 outColor;

void main() {
    vec2 coord = v_texcoord * u_resolution;
    vec4 color = texture(u_texture, v_texcoord);
    vec2 offset = vec2(-10.0, 10.0);
    vec4 shadow = texture(u_texture, (v_texcoord * u_resolution + offset) / u_resolution);
    float shadowAlpha = shadow.a - color.a;
    outColor = color + u_color * pow(clamp(shadowAlpha, 0.0, 1.0), 0.5);
}
`;

export type Options = {
    active: boolean;
    color: {
        r: number;
        g: number;
        b: number;
        a: number;
    }
};

export async function createShadowEffect(context: GlContext, getOptions: () => Options): Promise<Effect> {
    const { gl } = context;
    const vertexBuffer = context.createBuffer();
    vertexBuffer.bind(() => {
        vertexBuffer.setData(new Float32Array([
            -1, -1, 0,
            -1, 1, 0,
            1, -1, 0,
            -1, 1, 0,
            1, 1, 0,
            1, -1, 0,
        ]), 'static');
    });
    const texcoordBuffer = context.createBuffer();
    texcoordBuffer.bind(() => {
        texcoordBuffer.setData(new Float32Array([
            0, 0,
            0, 1,
            1, 0,
            0, 1,
            1, 1,
            1, 0,
        ]), 'static');
    });

    const vertexShader = context.createShader({ type: 'vertex', source: SHADOW_VERTEX_SHADER });
    const fragmentShader = context.createShader({ type: 'fragment', source: SHADOW_FRAGMENT_SHADER });
    const program = context.createProgram([vertexShader, fragmentShader]);

    function render(state: AvatarState, texture: GlTexture, dest: GlFramebuffer) {
        dest.use(() => {
            const resolution = [texture.width, texture.height];
            const options = getOptions();
            program.use(() => {
                const position = program.getAttribute('a_position');
                const texcoord = program.getAttribute('a_texcoord');
                const resolutionUniform = program.getUniform('u_resolution').asVec2();
                const textureUniform = program.getUniform('u_texture').asSampler2D();
                const colorUniform = program.getUniform('u_color').asVec4();

                position.set(vertexBuffer, 3, gl.FLOAT, false, 0, 0);
                texcoord.set(texcoordBuffer, 2, gl.FLOAT, false, 0, 0);
                resolutionUniform.set(new Vec2(resolution[0], resolution[1]));
                textureUniform.set(texture);
                const { r, g, b, a } = options.color;
                colorUniform.set(new Vec4(r, g, b, a));
                
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            });
        });
    }

    return { render };
}
