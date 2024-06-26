import type { ShaderSource } from '$lib/components/canvas/glcontext.js';

export const LIVE_VERTEX_SHADER: ShaderSource = {
    source: `#version 300 es
    
    precision highp float;
    
    layout (location = 0) in float i_value;
    
    uniform float u_length;
    uniform float u_minValue;
    uniform float u_maxValue;
    
    #define linearstep(edge0, edge1, x) max(min((x - edge0) / (edge1 - edge0), 1.0), 0.0)
    
    void main(void) {
      gl_Position = vec4(
        (float(gl_VertexID) / u_length) * 2.0 - 1.0,
        linearstep(u_minValue, u_maxValue, i_value) * 2.0 - 1.0,
        0.0,
        1.0
      );
    }
    `,
    type: 'vertex',
};

export const LINE_FRAGMENT_SHADER: ShaderSource = {
    source: `#version 300 es

    precision highp float;
    
    out vec4 o_color;
    
    uniform vec3 u_color;
    
    void main(void) {
      o_color = vec4(u_color, 1.0);
    }
    `,
    type: 'fragment',
};
