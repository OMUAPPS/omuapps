export const GRID_VERTEX_SHADER = `#version 300 es

precision highp float;

uniform mat4 u_projection;

in vec3 a_position;
in vec2 a_texcoord;

out vec2 v_texcoord;

void main() {
    gl_Position = vec4(a_position, 1.0);

    v_texcoord = a_texcoord;
}
`;

export const GRID_FRAGMENT_SHADER = `#version 300 es

precision highp float;

uniform mat4 u_projection;
uniform vec2 u_resolution;
uniform vec4 u_gridColor;
uniform vec4 u_backgroundColor;

in vec2 v_texcoord;

out vec4 outColor;

void main() {
    vec2 coord = (v_texcoord * 2.0 - 1.0) * u_resolution;
    vec4 projected = u_projection * vec4(coord, 0.0, 2.0);
    vec2 gridCoord = mod(projected.xy, 100.0);
    vec2 gridDist = min(gridCoord, 100.0 - gridCoord);
    float gridDistSq = dot(gridDist, gridDist);
    
    float gridAlpha = smoothstep(0.0, 1.0, 1.0 - gridDistSq / 15.0);
    vec4 gridColor = mix(u_backgroundColor, u_gridColor, gridAlpha);

    outColor = gridColor;
}
`;
