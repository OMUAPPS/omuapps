const VERTEX_SHADER_SOURCE = `#version 300 es

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

export const VERTEX_SHADER = {
    source: VERTEX_SHADER_SOURCE,
    type: 'vertex',
}

const FRAGMENT_SHADER_SOURCE = `#version 300 es

precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_color;

in vec2 v_texcoord;

out vec4 outColor;

void main() {
    outColor = vec4(u_color, 1.0);
}
`;

export const FRAGMENT_SHADER = {
    source: FRAGMENT_SHADER_SOURCE,
    type: 'fragment',
}
