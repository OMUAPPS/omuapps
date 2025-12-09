import type { GlContext, GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext.js';
import { BetterMath } from '$lib/math.js';
import { Vec4 } from '$lib/math/vec4.js';
import type { AvatarAction, Effect } from '../avatars/avatar.js';

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

uniform sampler2D u_texture;
uniform vec4 u_color;

in vec2 v_texcoord;

out vec4 outColor;

void main() {
    vec2 coord = v_texcoord;
    vec4 color = texture(u_texture, v_texcoord);
    outColor = color * u_color;
}
`;

export const DEFAULT_SPEECH_EFFECT_OPTIONS = {
    active: true,
    intensity: {
        inactive: 0.6,
        speaking: 1,
        deafened: 0.3,
        muted: 0.3,
    },
};

function getIntensities(action: AvatarAction, options: typeof DEFAULT_SPEECH_EFFECT_OPTIONS) {
    const { inactive, speaking, deafened, muted } = options.intensity;
    let intensity = inactive;
    if (action.deaf || action.self_deaf) {
        intensity = deafened;
    } else if (action.mute || action.self_mute) {
        intensity = muted;
    } else if (action.talking) {
        intensity = speaking;
    }
    return intensity;
}

export async function createSpeechEffect(context: GlContext, getOptions: () => typeof DEFAULT_SPEECH_EFFECT_OPTIONS): Promise<Effect> {
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

    const intensityMap = new Map<string, number>();

    function render(action: AvatarAction, texture: GlTexture, dest: GlFramebuffer) {
        dest.use(() => {
            const options = getOptions();
            program.use(() => {
                const position = program.getAttribute('a_position');
                const texcoord = program.getAttribute('a_texcoord');
                const textureUniform = program.getUniform('u_texture').asSampler2D();
                const colorUniform = program.getUniform('u_color').asVec4();

                position.set(vertexBuffer, 3, gl.FLOAT, false, 0, 0);
                texcoord.set(texcoordBuffer, 2, gl.FLOAT, false, 0, 0);
                textureUniform.set(texture);
                let talkIntensity = intensityMap.get(action.id);
                const targetIntensity = getIntensities(action, options);
                talkIntensity = talkIntensity ?? targetIntensity;
                if (talkIntensity < targetIntensity) {
                    talkIntensity = BetterMath.lerp(talkIntensity, targetIntensity, 0.3);
                } else {
                    talkIntensity = BetterMath.lerp(talkIntensity, targetIntensity, 0.1);
                }
                intensityMap.set(action.id, talkIntensity);
                colorUniform.set(new Vec4(talkIntensity, talkIntensity, talkIntensity, 1));

                gl.drawArrays(gl.TRIANGLES, 0, 6);
            });
        });
    }

    return { render };
}
