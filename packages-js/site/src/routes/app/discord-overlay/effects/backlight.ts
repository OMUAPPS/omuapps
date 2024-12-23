import type { GlContext, GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext.js';
import { BetterMath } from '$lib/math.js';
import { Vec2 } from '$lib/math/vec2.js';
import type { AvatarAction, Effect } from '../pngtuber/avatar.js';

const BACKLIGHT_VERTEX_SHADER = `#version 300 es

precision highp float;

in vec3 a_position;
in vec2 a_texcoord;

out vec2 v_texcoord;

void main() {
    gl_Position = vec4(a_position, 1.0);

    v_texcoord = a_texcoord;
}
`;

const BACKLIGHT_FRAGMENT_SHADER = `#version 300 es

precision highp float;

uniform vec2 u_resolution;
uniform sampler2D u_texture;
uniform vec2 u_texsize;
uniform vec2 u_direction;
uniform float u_radius;
uniform float u_step;
uniform float u_weights[32];
uniform float u_weights_size;

in vec2 v_texcoord;

out vec4 outColor;

void main() {
    vec4 color = texture(u_texture, v_texcoord);
    float blur = 0.0;
    for (float i = -u_radius; i <= u_radius; i++) {
        vec2 offset = u_direction * i * u_texsize * u_step + vec2(0.0, 0.01);
        float sampled = texture(u_texture, (v_texcoord + offset) * 1.01).a;
        sampled = max(0.0, sampled - 0.9);
        float weight = u_weights[int(abs(i) / u_radius * (u_weights_size - 1.0))];
        blur += sampled * weight * 2.0;
    }
    outColor = max(vec4(0.0, 0.0, 0.0, color.a), color * min(1.1, pow(1.0 - blur + 0.1, 2.0)));
}
`;

export async function createBackLightEffect(context: GlContext): Promise<Effect> {
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

    const vertexShader = context.createShader({ type: 'vertex', source: BACKLIGHT_VERTEX_SHADER });
    const fragmentShader = context.createShader({ type: 'fragment', source: BACKLIGHT_FRAGMENT_SHADER });
    const program = context.createProgram([vertexShader, fragmentShader]);

    const verticalPassFramebuffer = context.createFramebuffer();
    const verticalPassTexture = context.createTexture();
    verticalPassTexture.use(() => {
        verticalPassTexture.setParams({
            minFilter: 'linear',
            magFilter: 'linear',
            wrapS: 'clamp-to-edge',
            wrapT: 'clamp-to-edge',
        });
    });
    verticalPassFramebuffer.use(() => {
        verticalPassFramebuffer.attachTexture(verticalPassTexture);
    });

    function calculateGaussianWeights(size: number): Float32Array {
        const weights = new Float32Array(size);
        let total = 0;
        for (let i = 0; i < size; i++) {
            const x = i / size;
            weights[i] = Math.exp(-x * x * 4);
            total += weights[i];
        }
        for (let i = 0; i < size; i++) {
            weights[i] /= total;
        }
        return weights;
    }

    const WEIGHTS_SIZE = 32;
    const WEIGHTS = calculateGaussianWeights(WEIGHTS_SIZE);
    const STEP = 3.0;
    const ROTAION = BetterMath.toRadians(65);

    function render(action: AvatarAction, texture: GlTexture, dest: GlFramebuffer) {
        verticalPassTexture.use(() => {
            verticalPassTexture.ensureSize(texture.width, texture.height);
        });
        const texelSize = new Vec2(1 / texture.width, 1 / texture.height);
        verticalPassFramebuffer.use(() => {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            program.use(() => {
                const position = program.getAttribute('a_position');
                const texcoord = program.getAttribute('a_texcoord');
                const texsizeUniform = program.getUniform('u_texsize').asVec2();
                const directionUniform = program.getUniform('u_direction').asVec2();
                const radiusUniform = program.getUniform('u_radius').asFloat();
                const stepUniform = program.getUniform('u_step').asFloat();
                const weightsUniform = program.getUniform('u_weights[0]').asFloatArray();
                const weightsSizeUniform = program.getUniform('u_weights_size').asFloat();
                const textureUniform = program.getUniform('u_texture').asSampler2D();

                position.set(vertexBuffer, 3, gl.FLOAT, false, 0, 0);
                texcoord.set(texcoordBuffer, 2, gl.FLOAT, false, 0, 0);
                texsizeUniform.set(texelSize);
                directionUniform.set(new Vec2(0, 1).rotate(ROTAION));
                radiusUniform.set(16.0);
                stepUniform.set(STEP);
                weightsUniform.set(WEIGHTS);
                weightsSizeUniform.set(WEIGHTS_SIZE);
                textureUniform.set(texture);

                gl.drawArrays(gl.TRIANGLES, 0, 6);
            });
        });
        dest.use(() => {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            program.use(() => {
                const position = program.getAttribute('a_position');
                const texcoord = program.getAttribute('a_texcoord');
                const texsizeUniform = program.getUniform('u_texsize').asVec2();
                const directionUniform = program.getUniform('u_direction').asVec2();
                const radiusUniform = program.getUniform('u_radius').asFloat();
                const stepUniform = program.getUniform('u_step').asFloat();
                const weightsUniform = program.getUniform('u_weights[0]').asFloatArray();
                const weightsSizeUniform = program.getUniform('u_weights_size').asFloat();
                const textureUniform = program.getUniform('u_texture').asSampler2D();

                position.set(vertexBuffer, 3, gl.FLOAT, false, 0, 0);
                texcoord.set(texcoordBuffer, 2, gl.FLOAT, false, 0, 0);
                texsizeUniform.set(texelSize);
                directionUniform.set(new Vec2(1, 0).rotate(ROTAION));
                radiusUniform.set(16.0);
                stepUniform.set(STEP);
                weightsUniform.set(WEIGHTS);
                weightsSizeUniform.set(WEIGHTS_SIZE);
                textureUniform.set(verticalPassTexture);

                gl.drawArrays(gl.TRIANGLES, 0, 6);
            });
        });
    }

    return { render };
}
