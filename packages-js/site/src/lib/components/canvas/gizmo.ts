import { Mat4 } from '$lib/math/mat4.js';
import type { GlContext, GlProgram } from './glcontext.js';

const GIZMO_VERTEX_SHADER = `#version 300 es

precision highp float;

uniform mat4 u_projection;
uniform mat4 u_model;
uniform mat4 u_view;

in vec3 a_position;

void main() {
    gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0);
}
`;

const GIZMO_FRAGMENT_SHADER = `#version 300 es

precision highp float;

out vec4 outColor;

void main() {
    outColor = vec4(1.0, 0.0, 0.0, 1.0);
}
`;

export class Gizmo {
    private readonly program: GlProgram;

    constructor(private readonly context: GlContext) {
        const vertexShader = context.createShader({source: GIZMO_VERTEX_SHADER, type: 'vertex'});
        const fragmentShader = context.createShader({source: GIZMO_FRAGMENT_SHADER, type: 'fragment'});
        this.program = context.createProgram([vertexShader, fragmentShader]);
    }

    public rect(matrix: Mat4, x1: number, y1: number, x2: number, y2: number): void {
        const vertexBuffer = this.context.createBuffer();
        vertexBuffer.bind(() => {
            vertexBuffer.setData(new Float32Array([
                x1, y1, 0,
                x2, y1, 0,
                x2, y2, 0,
                x1, y2, 0,
                x1, y1, 0,
                x2, y2, 0,
            ]), 'static');
        });

        const { gl } = this.context;

        this.program.use(() => {
            const projection = this.program.getUniform('u_projection').asMat4();
            const view = this.program.getUniform('u_view').asMat4();
            const model = this.program.getUniform('u_model').asMat4();
            
            projection.set(matrix);
            view.set(Mat4.IDENTITY);
            model.set(Mat4.IDENTITY);

            const position = this.program.getAttribute('a_position');
            position.set(vertexBuffer, 3, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }
}
