import { Bezier } from '$lib/math/bezier.js';
import { Vec2, type Vec2Like } from '$lib/math/vec2.js';
import { Vec4, type Vec4Like } from '$lib/math/vec4.js';
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

out vec4 fragColor;

void main() {
    fragColor = u_color;
}
`;

const TEXTURE_FRAGMENT_SHADER = `#version 300 es

precision highp float;

uniform sampler2D u_texture;
uniform vec4 u_color;

in vec2 v_texcoord;

out vec4 fragColor;

void main() {
    fragColor = texture(u_texture, v_texcoord) * u_color;
}
`;

const TEXTURE_COLOR_FRAGMENT_SHADER = `#version 300 es

precision highp float;

uniform sampler2D u_texture;
uniform vec4 u_color;

in vec2 v_texcoord;

out vec4 fragColor;

void main() {
    fragColor = u_color * texture(u_texture, v_texcoord).a;
}
`;

const TEXTURE_OUTLINE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform vec4 u_outlineColor;
uniform vec2 u_resolution;
uniform float u_outlineWidth;

in vec2 v_texcoord;

out vec4 fragColor;

void main() {
    vec2 offset = vec2(u_outlineWidth) / u_resolution;
    float alphaLeft = texture(u_texture, v_texcoord + vec2(-offset.x, 0.0)).a;
    float alphaRight = texture(u_texture, v_texcoord + vec2(offset.x, 0.0)).a;
    float alphaTop = texture(u_texture, v_texcoord + vec2(0.0, offset.y)).a;
    float alphaBottom = texture(u_texture, v_texcoord + vec2(0.0, -offset.y)).a;
    float neighborAverage = (alphaLeft + alphaRight + alphaTop + alphaBottom) / 4.0;
    vec4 color = texture(u_texture, v_texcoord);
    float diff = neighborAverage - color.a;
    fragColor = u_outlineColor * smoothstep(0.0, 0.1, diff);
}
`;

const QUADRATIC_BEZIER_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform float u_widthIn;
uniform float u_widthOut;
uniform vec4 u_color;
uniform vec2 p1;
uniform vec2 p2;
uniform vec2 p3;
uniform vec2 u_resolution;

in vec2 v_texcoord;

out vec4 fragColor;

#define EPSILON 1e-6
#define PI 3.141592653589793
bool eq(float a, float b) {
    return abs(b - a) < EPSILON;
}

#define PI 3.141592653589793

float cubeRoot(float x) {
    return sign(x) * pow(abs(x), 1.0/3.0);
}

int solveCubic(float a, float b, float c, float d, out vec3 roots) {
    if (abs(a) < EPSILON) {
        return 0;
    }
    
    b /= a;
    c /= a;
    d /= a;
    a = 1.0;

    float p = c - b*b/3.0;
    float q = d + (2.0*b*b*b)/27.0 - (b*c)/3.0;
    
    float discriminant = q*q/4.0 + p*p*p/27.0;
    int rootCount = 0;
    
    if (discriminant > EPSILON) {
        // One real root
        float sqrtDisc = sqrt(discriminant);
        float u = cubeRoot(-q/2.0 + sqrtDisc);
        float v = cubeRoot(-q/2.0 - sqrtDisc);
        
        roots[0] = u + v - b/3.0;
        rootCount = 1;
    } 
    else if (discriminant < -EPSILON) {
        float theta = acos((-q/2.0) / sqrt(-p*p*p/(27.0)));
        float sqrtTerm = 2.0 * sqrt(-p/3.0);
        
        roots[0] = sqrtTerm * cos(theta/3.0) - b/3.0;
        roots[1] = sqrtTerm * cos((theta + 2.0*PI)/3.0) - b/3.0;
        roots[2] = sqrtTerm * cos((theta + 4.0*PI)/3.0) - b/3.0;
        rootCount = 3;
    } 
    else {
        float u = cubeRoot(-q/2.0);
        roots[0] = 2.0*u - b/3.0;
        roots[1] = -u - b/3.0;
        rootCount = (abs(p) < EPSILON && abs(q) < EPSILON) ? 1 : 2;
    }
    
    return rootCount;
}

float quadraticBezier(
    float a,
    float b,
    float c,
    float t
) {
    float t0 = a;
    float t1 = -2.0 * a + 2.0 * b;
    float t2 = a - 2.0 * b + c;
    return t0 + t1 * t + t2 * t * t;
}

vec2 quadraticBezier2(
    vec2 a,
    vec2 b,
    vec2 c,
    float t
) {
    return vec2(
        quadraticBezier(a.x, b.x, c.x, t),
        quadraticBezier(a.y, b.y, c.y, t)
    );
}


float quadraticBezierDerivative(
    float a,
    float b,
    float c,
    float t
) {
    float t0 = -2.0 * a + 2.0 * b;
    float t1 = 2.0 * (a - 2.0 * b + c);
    return t0 + t1 * t;
}

vec2 quadraticBezierDerivative2(
    vec2 a,
    vec2 b,
    vec2 c,
    float t
) {
    return vec2(
        quadraticBezierDerivative(a.x, b.x, c.x, t),
        quadraticBezierDerivative(a.y, b.y, c.y, t)
    );
}

int bezierDistanceRoots(
    vec2 pa,
    vec2 pb,
    vec2 pc,
    vec2 p,
    inout vec3 roots
) {
    pa -= p;
    pb -= p;
    pc -= p;
    vec2 pa2 = pa * pa;
    vec2 pb2 = pb * pb;
    vec2 pc2 = pc * pc;
    vec2 a = (
        pa2
        -4.0 * pa * pb
        +2.0 * pa * pc
        +4.0 * pb2
        -4.0 * pb * pc
        +pc2
    );
    vec2 b = (
        -4.0 * pa2
        +12.0 * pa * pb
        -4.0 * pa * pc
        -8.0 * pb2
        +4.0 * pb * pc
    );
    vec2 c = (
        6.0 * pa2
        -12.0 * pa * pb
        +2.0 * pa * pc
        +4.0 * pb2
    );
    vec2 d = (
        -4.0 * pa2
        +4.0 * pa * pb
    );
    float a2 = (a.x+a.y)*4.0;
    float b2 = (b.x+b.y)*3.0;
    float c2 = (c.x+c.y)*2.0;
    float d2 = (d.x+d.y)*1.0;
    return solveCubic(a2, b2, c2, d2, roots);
}

float closestBezierPoint(
    vec2 a,
    vec2 b,
    vec2 c,
    vec2 p
) {
    vec3 roots = vec3(-1);
    int count = bezierDistanceRoots(a, b, c, p, roots);

    vec2 pt0 = quadraticBezier2(a, b, c, 0.0) - p;
    vec2 pt1 = quadraticBezier2(a, b, c, 1.0) - p;
    float d0 = dot(pt0, pt0);
    float d1 = dot(pt1, pt1);
    float minDist = min(d0, d1);
    float closest = d0 < d1 ? 0.0 : 1.0;
    for (int i = 0; i < count; i++) {
        float t = roots[i];
        if (t <= 0.0 || t >= 1.0) continue;
        vec2 point = quadraticBezier2(a, b, c, t) - p;
        float dist = dot(point, point);
        if (dist < minDist) {
            minDist = dist;
            closest = t;
        }
    }
    return min(max(0.0, closest), 1.0);
}

vec4 getColor(float dir, float dist, float t) {
    float radius = mix(u_widthIn, u_widthOut, t);
    float alpha = smoothstep(radius - 1.0, radius - 2.0, dist);
    return vec4(u_color.rgb, u_color.a * alpha);
}

void main() {
    vec2 fragCoord = v_texcoord * u_resolution;
    float closest = closestBezierPoint(p1, p2, p3, fragCoord);
    vec2 point = quadraticBezier2(p1, p2, p3, closest) - fragCoord;
    vec2 normal = quadraticBezierDerivative2(p1, p2, p3, closest);
    float dist = length(point);
    float dir = closest < 0.0001 || closest > 0.9999 ? dot(normalize(point), normalize(normal)) : 0.0;
    fragColor = getColor(dir, dist, closest);
}
`;

const CIRCLE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec4 u_color;
uniform vec2 u_resolution;
uniform float u_radiusInner;
uniform float u_radiusOuter;
uniform float u_smoothness;

in vec2 v_texcoord;

out vec4 fragColor;

void main() {
    vec2 uv = v_texcoord * u_resolution;
    float dist = length(uv) / 2.0;
    float alpha = smoothstep(u_radiusOuter, u_radiusOuter - u_smoothness, dist) * smoothstep(u_radiusInner - u_smoothness, u_radiusInner, dist);
    fragColor = u_color * alpha;
}
`;

export class Draw {
    private readonly vertexShader: GlShader;
    private readonly colorProgram: GlProgram;
    private readonly textureProgram: GlProgram;
    private readonly textureColorProgram: GlProgram;
    private readonly textureOutlineProgram: GlProgram;
    private readonly bezierProgram: GlProgram;
    private readonly circleProgram: GlProgram;
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
        this.bezierProgram = this.createProgram(QUADRATIC_BEZIER_FRAGMENT_SHADER);
        this.circleProgram = this.createProgram(CIRCLE_FRAGMENT_SHADER);
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

    public setMesh(vertices?: Float32Array, texcoords?: Float32Array): void {
        if (vertices) {
            this.vertexBuffer.bind(() => {
                this.vertexBuffer.setData(vertices, 'static');
            });
        }
        if (texcoords) {
            this.texcoordBuffer.bind(() => {
                this.texcoordBuffer.setData(texcoords, 'static');
            });
        }
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
        ]));

        this.colorProgram.use(() => {
            this.colorProgram.getUniform('u_projection').asMat4().set(this.matrices.projection.get());
            this.colorProgram.getUniform('u_view').asMat4().set(this.matrices.view.get());
            this.colorProgram.getUniform('u_model').asMat4().set(this.matrices.model.get());
            this.colorProgram.getUniform('u_color').asVec4().set(color);
            
            const position = this.colorProgram.getAttribute('a_position');
            position.set(this.vertexBuffer, 3, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, gl.TRIANGLE_FAN);
        });
    }

    public rectangleStroke(left: number, top: number, right: number, bottom: number, color: Vec4, width: number): void {
        const { gl } = this.glContext;
        
        this.setMesh(new Float32Array([
            // top
            left - width, top - width, 0,
            right + width, top - width, 0,
            right + width, top + width, 0,
            left - width, top - width, 0,
            right + width, top + width, 0,
            left - width, top + width, 0,
            // right
            right - width, top - width, 0,
            right + width, top - width, 0,
            right + width, bottom + width, 0,
            right - width, top - width, 0,
            right + width, bottom + width, 0,
            right - width, bottom + width, 0,
            // bottom
            left - width, bottom - width, 0,
            right + width, bottom - width, 0,
            right + width, bottom + width, 0,
            left - width, bottom - width, 0,
            right + width, bottom + width, 0,
            left - width, bottom + width, 0,
            // left
            left - width, top - width, 0,
            left + width, top - width, 0,
            left + width, bottom + width, 0,
            left - width, top - width, 0,
            left + width, bottom + width, 0,
            left - width, bottom + width, 0,
        ]));

        this.colorProgram.use(() => {
            this.colorProgram.getUniform('u_projection').asMat4().set(this.matrices.projection.get());
            this.colorProgram.getUniform('u_view').asMat4().set(this.matrices.view.get());
            this.colorProgram.getUniform('u_model').asMat4().set(this.matrices.model.get());
            this.colorProgram.getUniform('u_color').asVec4().set(color);
            
            const position = this.colorProgram.getAttribute('a_position');
            position.set(this.vertexBuffer, 3, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 24);
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
        const uvMargin = {
            x: outlineWidth / width,
            y: outlineWidth / height,
        };
        
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
            this.textureOutlineProgram.getUniform('u_resolution').asVec2().set({x: right - left, y: bottom - top});
            const mvp = this.matrices.get();
            this.textureOutlineProgram.getUniform('u_outlineWidth').asFloat().set(outlineWidth / mvp.m00 / gl.canvas.width);
            
            const position = this.textureOutlineProgram.getAttribute('a_position');
            position.set(this.vertexBuffer, 3, gl.FLOAT, false, 0, 0);
            const texcoord = this.textureOutlineProgram.getAttribute('a_texcoord');
            texcoord.set(this.texcoordBuffer, 2, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }

    public bezierCurve(
        a: Vec2Like,
        b: Vec2Like,
        c: Vec2Like,
        color: Vec4Like,
        widthIn: number,
        widthOut: number
    ): void {
        const { gl } = this.glContext;
        
        const bounds = Bezier.quadraticBounds2(a, b, c);
        const width = bounds.max.x - bounds.min.x;
        const height = bounds.max.y - bounds.min.y;
        const maxWidth = Math.max(widthIn, widthOut);
        const uvMargin = {
            x: maxWidth / width,
            y: maxWidth / height,
        };

        this.setMesh(new Float32Array([
            // left - maxWidth, top - maxWidth, 0,
            // left + width + maxWidth, top - maxWidth, 0,
            // left + width + maxWidth, bottom + maxWidth, 0,
            // left - maxWidth, top - maxWidth, 0,
            // left + width + maxWidth, bottom + maxWidth, 0,
            // left - maxWidth, bottom + maxWidth, 0,
            bounds.min.x - maxWidth, bounds.min.y - maxWidth, 0,
            bounds.max.x + maxWidth, bounds.min.y - maxWidth, 0,
            bounds.max.x + maxWidth, bounds.max.y + maxWidth, 0,
            bounds.min.x - maxWidth, bounds.min.y - maxWidth, 0,
            bounds.max.x + maxWidth, bounds.max.y + maxWidth, 0,
            bounds.min.x - maxWidth, bounds.max.y + maxWidth, 0,
        ]), new Float32Array([
            -uvMargin.x, -uvMargin.y,
            1 + uvMargin.x, -uvMargin.y,
            1 + uvMargin.x, 1 + uvMargin.y,
            -uvMargin.x, -uvMargin.y,
            1 + uvMargin.x, 1 + uvMargin.y,
            -uvMargin.x, 1 + uvMargin.y,
        ]));

        this.bezierProgram.use(() => {
            this.bezierProgram.getUniform('u_projection').asMat4().set(this.matrices.projection.get());
            this.bezierProgram.getUniform('u_view').asMat4().set(this.matrices.view.get());
            this.bezierProgram.getUniform('u_model').asMat4().set(this.matrices.model.get());
            this.bezierProgram.getUniform('u_resolution').asVec2().set({x: width, y: height});
            this.bezierProgram.getUniform('u_color').asVec4().set(color);
            this.bezierProgram.getUniform('u_widthIn').asFloat().set(widthIn);
            this.bezierProgram.getUniform('u_widthOut').asFloat().set(widthOut);
            this.bezierProgram.getUniform('p1').asVec2().set(Vec2.from(a).sub(bounds.min));
            this.bezierProgram.getUniform('p2').asVec2().set(Vec2.from(b).sub(bounds.min));
            this.bezierProgram.getUniform('p3').asVec2().set(Vec2.from(c).sub(bounds.min));
            
            const position = this.bezierProgram.getAttribute('a_position');
            position.set(this.vertexBuffer, 3, gl.FLOAT, false, 0, 0);
            const texcoord = this.bezierProgram.getAttribute('a_texcoord');
            texcoord.set(this.texcoordBuffer, 2, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }

    public circle(
        x: number,
        y: number,
        radiusInner: number,
        radiusOuter: number,
        color: Vec4,
        smoothness: number = 1.0,
    ): void {
        const { gl } = this.glContext;
        
        this.setMesh(new Float32Array([
            x - radiusOuter, y - radiusOuter, 0,
            x + radiusOuter, y - radiusOuter, 0,
            x + radiusOuter, y + radiusOuter, 0,
            x - radiusOuter, y - radiusOuter, 0,
            x + radiusOuter, y + radiusOuter, 0,
            x - radiusOuter, y + radiusOuter, 0,
        ]), new Float32Array([
            -1.0, -1.0,
            1.0, -1.0,
            1.0, 1.0,
            -1.0, -1.0,
            1.0, 1.0,
            -1.0, 1.0,
        ]));

        this.circleProgram.use(() => {
            this.circleProgram.getUniform('u_projection').asMat4().set(this.matrices.projection.get());
            this.circleProgram.getUniform('u_view').asMat4().set(this.matrices.view.get());
            this.circleProgram.getUniform('u_model').asMat4().set(this.matrices.model.get());
            this.circleProgram.getUniform('u_resolution').asVec2().set({x: radiusOuter * 2, y: radiusOuter * 2});
            this.circleProgram.getUniform('u_color').asVec4().set(color);
            this.circleProgram.getUniform('u_radiusInner').asFloat().set(radiusInner / 2);
            this.circleProgram.getUniform('u_radiusOuter').asFloat().set(radiusOuter / 2);
            this.circleProgram.getUniform('u_smoothness').asFloat().set(smoothness);
            
            const position = this.circleProgram.getAttribute('a_position');
            position.set(this.vertexBuffer, 3, gl.FLOAT, false, 0, 0);
            const texcoord = this.circleProgram.getAttribute('a_texcoord');
            texcoord.set(this.texcoordBuffer, 2, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }
}
