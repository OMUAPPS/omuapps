import { Mat4 } from '$lib/math/mat4.js';
import type { Vec4 } from '$lib/math/vec4.js';
import type { GlBuffer, GlContext, GlProgram } from './glcontext.js';

const VERTEX_SHADER = `#version 300 es

precision highp float;

uniform mat4 u_projection;
uniform mat4 u_model;
uniform mat4 u_view;

in vec3 a_position;

void main() {
    gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0);
}
`;

const RAGMENT_SHADER = `#version 300 es

precision highp float;

uniform vec4 u_color;

out vec4 outColor;

void main() {
    outColor = u_color;
}
`;

export class Gizmo {
    private readonly program: GlProgram;
    private vertexBuffer: GlBuffer | null = null;

    constructor(private readonly context: GlContext) {
        const vertexShader = context.createShader({source: VERTEX_SHADER, type: 'vertex'});
        const fragmentShader = context.createShader({source: RAGMENT_SHADER, type: 'fragment'});
        this.program = context.createProgram([vertexShader, fragmentShader]);
    }

    private buildVertexBuffer(vertices: Float32Array): GlBuffer {
        if (!this.vertexBuffer) {
            this.vertexBuffer = this.context.createBuffer();
        }
        const vertexBuffer = this.vertexBuffer;
        vertexBuffer.bind(() => {
            vertexBuffer.setData(vertices, 'static');
        });
        return vertexBuffer;
    }

    public rect(matrix: Mat4, x1: number, y1: number, x2: number, y2: number, color: Vec4): void {
        const vertexBuffer = this.buildVertexBuffer(new Float32Array([
            x1, y1, 0,
            x2, y1, 0,
            x2, y2, 0,
            x1, y1, 0,
            x2, y2, 0,
            x1, y2, 0,
        ]));
        const { gl } = this.context;

        this.program.use(() => {
            const projectionUniform = this.program.getUniform('u_projection').asMat4();
            const viewUniform = this.program.getUniform('u_view').asMat4();
            const modelUniform = this.program.getUniform('u_model').asMat4();
            const colorUniform = this.program.getUniform('u_color').asVec4();
            
            projectionUniform.set(matrix);
            viewUniform.set(Mat4.IDENTITY);
            modelUniform.set(Mat4.IDENTITY);
            colorUniform.set(color);

            const position = this.program.getAttribute('a_position');
            position.set(vertexBuffer, 3, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }

    public rectOutline(matrix: Mat4, x1: number, y1: number, x2: number, y2: number, color: Vec4, lineWidth: number = 1): void {
        const vertexBuffer = this.buildVertexBuffer(new Float32Array([
            // top
            x1 - lineWidth, y1 - lineWidth, 0,
            x2 + lineWidth, y1 - lineWidth, 0,
            x2 + lineWidth, y1 + lineWidth, 0,
            x1 - lineWidth, y1 - lineWidth, 0,
            x2 + lineWidth, y1 + lineWidth, 0,
            x1 - lineWidth, y1 + lineWidth, 0,
            // right
            x2 - lineWidth, y1 - lineWidth, 0,
            x2 + lineWidth, y1 - lineWidth, 0,
            x2 + lineWidth, y2 + lineWidth, 0,
            x2 - lineWidth, y1 - lineWidth, 0,
            x2 + lineWidth, y2 + lineWidth, 0,
            x2 - lineWidth, y2 + lineWidth, 0,
            // bottom
            x1 - lineWidth, y2 - lineWidth, 0,
            x2 + lineWidth, y2 - lineWidth, 0,
            x2 + lineWidth, y2 + lineWidth, 0,
            x1 - lineWidth, y2 - lineWidth, 0,
            x2 + lineWidth, y2 + lineWidth, 0,
            x1 - lineWidth, y2 + lineWidth, 0,
            // left
            x1 - lineWidth, y1 - lineWidth, 0,
            x1 + lineWidth, y1 - lineWidth, 0,
            x1 + lineWidth, y2 + lineWidth, 0,
            x1 - lineWidth, y1 - lineWidth, 0,
            x1 + lineWidth, y2 + lineWidth, 0,
            x1 - lineWidth, y2 + lineWidth, 0,
        ]));
        const { gl } = this.context;

        this.program.use(() => {
            const projectionUniform = this.program.getUniform('u_projection').asMat4();
            const viewUniform = this.program.getUniform('u_view').asMat4();
            const modelUniform = this.program.getUniform('u_model').asMat4();
            const colorUniform = this.program.getUniform('u_color').asVec4();
            
            projectionUniform.set(matrix);
            viewUniform.set(Mat4.IDENTITY);
            modelUniform.set(Mat4.IDENTITY);
            colorUniform.set(color);

            const position = this.program.getAttribute('a_position');
            position.set(vertexBuffer, 3, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 24);
        });
    }

    public triangle(matrix: Mat4, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, color: Vec4): void {
        const vertexBuffer = this.buildVertexBuffer(new Float32Array([
            x1, y1, 0,
            x2, y2, 0,
            x3, y3, 0,
        ]));
        const { gl } = this.context;

        this.program.use(() => {
            const projectionUniform = this.program.getUniform('u_projection').asMat4();
            const viewUniform = this.program.getUniform('u_view').asMat4();
            const modelUniform = this.program.getUniform('u_model').asMat4();
            const colorUniform = this.program.getUniform('u_color').asVec4();
            
            projectionUniform.set(matrix);
            viewUniform.set(Mat4.IDENTITY);
            modelUniform.set(Mat4.IDENTITY);
            colorUniform.set(color);

            const position = this.program.getAttribute('a_position');
            position.set(vertexBuffer, 3, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        });
    }
}
