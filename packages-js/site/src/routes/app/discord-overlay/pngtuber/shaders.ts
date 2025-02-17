export const MVP_VERTEX_SHADER = `#version 300 es

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

export const TEXTURE_FRAGMENT_SHADER = `#version 300 es

precision highp float;

in vec2 v_texcoord;

uniform sampler2D u_texture;

out vec4 outColor;

void main() {
    vec4 color = texture(u_texture, v_texcoord);
    if (color.a < 0.1) {
        discard;
    }
    outColor = color;
}
`;


export const SPRITE_FRAGMENT_SHADER = `#version 300 es

precision highp float;

in vec2 v_texcoord;

uniform sampler2D u_texture;
uniform float u_frame_count;
uniform float u_frame;

out vec4 outColor;

void main() {
    vec2 uv = v_texcoord;
    uv.x /= u_frame_count;
    uv.x += u_frame / u_frame_count;
    vec4 color = texture(u_texture, uv);
    if (color.a < 0.1) {
        discard;
    }
    outColor = color;
}
`;
