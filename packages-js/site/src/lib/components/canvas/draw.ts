import { AABB2 } from '$lib/math/aabb2.js';
import { Bezier } from '$lib/math/bezier.js';
import { lerp, TAU } from '$lib/math/math.js';
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
    fragColor.rgb *= fragColor.a;
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
    fragColor.rgb *= u_color.a;
}
`;

const TEXTURE_MASK_FRAGMENT_SHADER = `#version 300 es

precision highp float;

uniform sampler2D u_texture;
uniform sampler2D u_mask;
uniform vec4 u_color;

in vec2 v_texcoord;

out vec4 fragColor;

void main() {
    fragColor = texture(u_texture, v_texcoord) * u_color * texture(u_mask, v_texcoord);
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
    // Consider 8 neighboring pixels around the current pixel
    float alpha = 0.0;
    for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
            vec2 dir = normalize(vec2(float(x), float(y)));
            vec2 sampleCoord = v_texcoord + dir * offset;
            bool isOnEdge = sampleCoord.x < 0.0 || sampleCoord.x > 1.0 || sampleCoord.y < 0.0 || sampleCoord.y > 1.0;
            if (!isOnEdge) {
                alpha = max(alpha, texture(u_texture, sampleCoord).a);
            }
        }
    }
    if (v_texcoord.x > 0.0 && v_texcoord.x < 1.0 && v_texcoord.y > 0.0 && v_texcoord.y < 1.0) {
        alpha -= texture(u_texture, v_texcoord).a;
    }
    fragColor = u_outlineColor * alpha;
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
    float inoutT = -(cos(PI * t) - 1.0) / 2.0;
    float radius = mix(u_widthIn, u_widthOut, inoutT);
    float alpha = smoothstep(radius - 1.0, radius - 2.0, dist);
    return u_color * alpha;
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
uniform vec2 u_direction;
uniform float u_angle;

in vec2 v_texcoord;

out vec4 fragColor;

float PI = 3.141592653589793;

float atan2(in float y, in float x)
{
    return x == 0.0 ? sign(y)*PI/2.0 : atan(y, x);
}

void main() {
    vec2 uv = v_texcoord * u_resolution;
    float dot = uv.x*u_direction.x + uv.y*u_direction.y;
    float det = uv.x*u_direction.y - uv.y*u_direction.x;
    float angle = atan2(det, dot);
    if (angle < u_angle) {
        discard;
    }
    float dist = length(uv);
    float alpha = smoothstep(u_radiusOuter, u_radiusOuter - u_smoothness, dist) * smoothstep(u_radiusInner - u_smoothness, u_radiusInner, dist);
    fragColor = u_color * alpha;
    fragColor.rgb *= u_color.a;
}
`;

const CIRCLE_TEXTURE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec4 u_color;
uniform vec2 u_resolution;
uniform float u_radiusInner;
uniform float u_radiusOuter;
uniform float u_smoothness;
uniform sampler2D u_texture;

in vec2 v_texcoord;

out vec4 fragColor;

void main() {
    vec2 fragCoord = vec2(v_texcoord.x * 2.0 - 1.0, v_texcoord.y * 2.0 - 1.0) * u_resolution;
    float dist = length(fragCoord) / 4.0;
    float alpha = smoothstep(u_radiusOuter, u_radiusOuter - u_smoothness, dist) * smoothstep(u_radiusInner - u_smoothness, u_radiusInner, dist);
    vec4 color = texture(u_texture, v_texcoord);
    fragColor = color * u_color * alpha;
}
`;

const ROUNDED_RECT_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec4 u_color;
uniform vec2 u_resolution;
uniform float u_width;
uniform float u_radius;
uniform float u_smoothness;
uniform sampler2D u_texture;

in vec2 v_texcoord;

out vec4 fragColor;

#define linearstep(edge0, edge1, x) min(max(((x) - (edge0)) / ((edge1) - (edge0)), 0.0), 1.0)

float roundedRect(vec2 start, vec2 end, vec2 point, float roundness) {
    float yDiff = max(start.y - point.y + roundness, point.y - end.y + roundness);
    float xDiff = max(start.x - point.x + roundness, point.x - end.x + roundness);
    return linearstep(u_smoothness, -u_smoothness, (length(vec2(max(xDiff, 0.0), max(yDiff, 0.0))) - roundness));
}

void main() {
    vec2 fragCoord = v_texcoord * u_resolution;
    float inner = 1.0 - roundedRect(vec2(0.0) + u_width, u_resolution - u_width, fragCoord, u_radius - u_width);
    float outer = roundedRect(vec2(0.0), u_resolution, fragCoord, u_radius);
    float alpha = outer * inner;
    fragColor = vec4(u_color.rgb, u_color.a * alpha);
    fragColor.rgb *= fragColor.a;
}`;

const ROUNDED_RECT_TEXTURE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec4 u_color;
uniform vec2 u_resolution;
uniform float u_radius;
uniform float u_smoothness;
uniform sampler2D u_texture;

in vec2 v_texcoord;

out vec4 fragColor;

#define linearstep(edge0, edge1, x) min(max(((x) - (edge0)) / ((edge1) - (edge0)), 0.0), 1.0)

float roundedRect(vec2 start, vec2 end, vec2 point, float roundness) {
    float yDiff = max(start.y - point.y + roundness, point.y - end.y + roundness);
    float xDiff = max(start.x - point.x + roundness, point.x - end.x + roundness);
    return length(vec2(max(xDiff, 0.0), max(yDiff, 0.0))) - roundness;
}

void main() {
    vec2 fragCoord = v_texcoord * u_resolution;
    float dist = roundedRect(vec2(0.0), u_resolution, fragCoord, u_radius);
    float alpha = linearstep(u_smoothness, -u_smoothness, dist);
    vec4 color = texture(u_texture, v_texcoord);
    fragColor = color * u_color * alpha;
}`;

const GRADIENT_RECT_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec4 u_color1;
uniform vec4 u_color2;
uniform vec2 u_dir;

in vec2 v_texcoord;

out vec4 fragColor;

void main() {
    vec2 uv = v_texcoord;
    float t = dot(uv, u_dir) / dot(u_dir, u_dir);
    vec4 color = mix(u_color1, u_color2, t);
    fragColor = color;
    fragColor.rgb *= color.a;
}`;

const BLUR_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_dir;
uniform float[32] u_weight;
uniform float u_weightCount;
uniform float u_radius;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec4 u_color;

in vec2 v_texcoord;

out vec4 fragColor;

float getWeight(float offset) {
    float t = abs(offset) / u_radius;
    int index = int(floor(t * u_weightCount));
    return mix(u_weight[index], u_weight[index + 1], fract(t * u_weightCount));
}

void main() {
    vec2 texelSize = 1.0 / u_resolution;
    vec4 color = vec4(0.0);
    int half_radius = int(u_radius) / 2;
    float alpha = 0.0;
    for (int i = 0; i <= int(u_radius); i++) {
        int index = i - half_radius;
        vec2 offset = u_dir * float(index) * texelSize;
        float weight = getWeight(float(index));
        vec4 sampleCol = texture(u_texture, v_texcoord + offset);
        color += sampleCol * weight;
        alpha += weight;
    }
    if (alpha > 0.0) {
        color /= alpha;
    }
    fragColor = color * u_color * u_color.a;
}
`;

const THRESHOLD_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform float u_threshold;

in vec2 v_texcoord;

out vec4 fragColor;

void main() {
    vec4 color = texture(u_texture, v_texcoord);
    float brightness = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    float alpha = step(u_threshold, brightness);
    fragColor = vec4(vec3(alpha), color.a);
}
`;

type TextTexture = {
    texture: GlTexture;
    width: number;
    height: number;
    font: string;
};

export class Draw {
    public readonly vertexShader: GlShader;
    private readonly colorProgram: GlProgram;
    private readonly textureProgram: GlProgram;
    private readonly textureMaskProgram: GlProgram;
    private readonly textureColorProgram: GlProgram;
    private readonly textureOutlineProgram: GlProgram;
    private readonly gradientRectProgram: GlProgram;
    private readonly bezierProgram: GlProgram;
    private readonly circleProgram: GlProgram;
    private readonly circleTextureProgram: GlProgram;
    private readonly roundedRectProgram: GlProgram;
    private readonly roundedRectTextureProgram: GlProgram;
    private readonly blurProgram: GlProgram;
    private readonly thresholdProgram: GlProgram;
    public readonly vertexBuffer: GlBuffer;
    public readonly texcoordBuffer: GlBuffer;
    private readonly frameBuffer: GlFramebuffer;
    private readonly frameBufferTexture: GlTexture;
    private readonly textCanvas: OffscreenCanvas;
    private readonly textContext: OffscreenCanvasRenderingContext2D;
    private readonly textRenderPool: Map<string, TextTexture> = new Map();
    private readonly loadedCharacters: Set<string> = new Set();
    public fontFamily: string = 'sans-serif';
    public fontSize: number = 10;
    public fontWeight: string = '600';
    public fontStyle: string = 'normal';

    constructor(
        private readonly matrices: Matrices,
        private readonly glContext: GlContext,
    ) {
        this.vertexShader = glContext.createShader({ type: 'vertex', source: VERTEX_SHADER });
        this.colorProgram = this.createProgram(COLOR_FRAGMENT_SHADER);
        this.textureProgram = this.createProgram(TEXTURE_FRAGMENT_SHADER);
        this.textureMaskProgram = this.createProgram(TEXTURE_MASK_FRAGMENT_SHADER);
        this.textureColorProgram = this.createProgram(TEXTURE_COLOR_FRAGMENT_SHADER);
        this.textureOutlineProgram = this.createProgram(TEXTURE_OUTLINE_FRAGMENT_SHADER);
        this.gradientRectProgram = this.createProgram(GRADIENT_RECT_FRAGMENT_SHADER);
        this.bezierProgram = this.createProgram(QUADRATIC_BEZIER_FRAGMENT_SHADER);
        this.circleProgram = this.createProgram(CIRCLE_FRAGMENT_SHADER);
        this.circleTextureProgram = this.createProgram(CIRCLE_TEXTURE_FRAGMENT_SHADER);
        this.roundedRectProgram = this.createProgram(ROUNDED_RECT_FRAGMENT_SHADER);
        this.roundedRectTextureProgram = this.createProgram(ROUNDED_RECT_TEXTURE_FRAGMENT_SHADER);
        this.blurProgram = this.createProgram(BLUR_FRAGMENT_SHADER);
        this.thresholdProgram = this.createProgram(THRESHOLD_FRAGMENT_SHADER);
        this.vertexBuffer = glContext.createBuffer();
        this.texcoordBuffer = glContext.createBuffer();
        this.frameBuffer = glContext.createFramebuffer();
        this.frameBufferTexture = glContext.createTexture();
        this.textCanvas = new OffscreenCanvas(0, 0);
        const textContext = this.textCanvas.getContext('2d', { willReadFrequently: true });
        if (textContext === null) {
            throw new Error('Failed to get 2d rendering context from text offscreen canvas');
        }
        this.textContext = textContext;
        this.ensureFrameBuffer(4, 4);
    }

    private ensureFrameBuffer(width: number, height: number): void {
        this.frameBufferTexture.use(() => {
            this.frameBufferTexture.setImage(null, {
                width,
                height,
                internalFormat: 'rgba',
                format: 'rgba',
            });
            this.frameBufferTexture.setParams({
                magFilter: 'linear',
                minFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
        });

        this.frameBuffer.use(() => {
            this.frameBuffer.attachTexture(this.frameBufferTexture);
        });
    }

    private createProgram(fragmentSource: string): GlProgram {
        const fragmentShader = this.glContext.createShader({ type: 'fragment', source: fragmentSource });
        return this.glContext.createProgram([this.vertexShader, fragmentShader]);
    }

    public scissor(bounds: AABB2) {
        const { gl } = this.glContext;
        const { canvas } = gl;
        gl.enable(gl.SCISSOR_TEST);
        const mvp = this.matrices.getModelToView();
        const viewBounds = mvp.transformAABB2(bounds);
        gl.scissor(viewBounds.min.x, canvas.height - viewBounds.max.y, viewBounds.width, viewBounds.height);
    }

    public endScissor() {
        const { gl } = this.glContext;
        gl.disable(gl.SCISSOR_TEST);
    }

    private get font(): string {
        return `${this.fontStyle} ${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;
    }

    public measureText(text: string): TextMetrics {
        this.textContext.font = this.font;
        return this.textContext.measureText(text);
    }

    public measureTextActual(text: string) {
        this.textContext.font = this.font;
        const metrics = this.textContext.measureText(text);
        return new AABB2(
            new Vec2(metrics.actualBoundingBoxLeft, metrics.actualBoundingBoxAscent),
            new Vec2(metrics.actualBoundingBoxRight, metrics.actualBoundingBoxDescent),
        );
    }

    private unpackMultipliedAlpha(): ImageData {
        const data = this.textContext.getImageData(0, 0, this.textCanvas.width, this.textCanvas.height);
        // const pixels = data.data;
        // for (let i = 0; i < pixels.length; i += 4) {
        //     const r = pixels[i + 0];
        //     const g = pixels[i + 1];
        //     const b = pixels[i + 2];
        //     const a = pixels[i + 3];
        //     pixels[i + 0] = r / a;
        //     pixels[i + 1] = g / a;
        //     pixels[i + 2] = b / a;
        //     pixels[i + 3] = a;
        // }
        return data;
    }

    private async generateTextTexture(text: string): Promise<TextTexture | null> {
        const key = JSON.stringify({ font: this.font, text });
        const existing = this.textRenderPool.get(key);
        if (existing) {
            return existing;
        }
        this.textContext.font = this.font;
        const bounds = this.measureTextActual(text);
        const dimensions = bounds.dimensions().max(Vec2.ZERO);
        this.textCanvas.width = dimensions.x;
        this.textCanvas.height = dimensions.y;
        this.textContext.clearRect(0, 0, dimensions.x, dimensions.y);
        this.textContext.globalCompositeOperation = 'source-over';
        this.textContext.textAlign = 'start';
        this.textContext.textBaseline = 'top';
        this.textContext.fillStyle = '#fff';
        this.textContext.font = this.font;
        this.textContext.fillText(text, bounds.min.x, bounds.min.y);
        if (dimensions.x === 0 || dimensions.y === 0) {
            return null;
        }
        const texture = this.glContext.createTexture();
        texture.use(() => {
            texture.setImage(this.unpackMultipliedAlpha(), {
                width: dimensions.x,
                height: dimensions.y,
                internalFormat: 'rgba',
                format: 'rgba',
            });
            texture.setParams({
                minFilter: 'linear',
                magFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
        });
        const textTexture: TextTexture = {
            texture,
            width: dimensions.x,
            height: dimensions.y,
            font: this.fontFamily,
        };
        this.textRenderPool.set(key, textTexture);
        return textTexture;
    }

    public async text(left: number, top: number, text: string, color: Vec4Like): Promise<boolean> {
        this.textContext.font = this.font;
        const textTexture = await this.generateTextTexture(text);
        if (!textTexture) {
            return false;
        }
        const { width, height, texture } = textTexture;
        this.textureColor(left, top, left + width, top + height, texture, color);
        return true;
    }

    public async textAlign(anchor: Vec2Like, text: string, align: Vec2Like, color?: Vec4Like, stroke?: { width: number; color: Vec4 }): Promise<boolean> {
        this.textContext.font = this.font;
        const textTexture = await this.generateTextTexture(text);
        if (!textTexture) {
            return false;
        }
        const { width, height, texture } = textTexture;
        const pos = Vec2.from(anchor).sub({ x: width * align.x, y: height * align.y });
        if (stroke) {
            for (let index = 0; index < 8; index++) {
                const dx = Math.cos(index / 8 * TAU) * stroke.width;
                const dy = Math.sin(index / 8 * TAU) * stroke.width;
                this.texture(
                    pos.x + dx,
                    pos.y + dy,
                    pos.x + dx + width,
                    pos.y + dy + height,
                    texture,
                    stroke.color,
                );
            }
        }
        if (color) {
            this.texture(pos.x, pos.y, pos.x + width, pos.y + height, texture, color);
        }
        return true;
    }

    public setMesh(program: GlProgram, vertices?: Float32Array, texcoords?: Float32Array): void {
        if (vertices) {
            this.vertexBuffer.bind(() => {
                this.vertexBuffer.setData(vertices, 'static');
            });
            program.getAttribute('a_position').set(this.vertexBuffer, 3, this.glContext.gl.FLOAT, false, 0, 0);
        }
        if (texcoords) {
            this.texcoordBuffer.bind(() => {
                this.texcoordBuffer.setData(texcoords, 'static');
            });
            program.getAttribute('a_texcoord').set(this.texcoordBuffer, 2, this.glContext.gl.FLOAT, false, 0, 0);
        }
    }

    public setMeshRect(program: GlProgram, left: number, top: number, right: number, bottom: number): void {
        this.setMesh(program, new Float32Array([
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
    }

    public setMatrices(program: GlProgram): void {
        program.getUniform('u_projection').asMat4().set(this.matrices.projection.get());
        program.getUniform('u_view').asMat4().set(this.matrices.view.get());
        program.getUniform('u_model').asMat4().set(this.matrices.model.get());
    }

    public triangle(p1: Vec2Like, p2: Vec2Like, p3: Vec2Like, color: Vec4Like): void {
        const { gl } = this.glContext;

        this.colorProgram.use(() => {
            this.setMesh(this.colorProgram, new Float32Array([
                p1.x, p1.y, 0,
                p2.x, p2.y, 0,
                p3.x, p3.y, 0,
            ]));

            this.setMatrices(this.colorProgram);
            this.colorProgram.getUniform('u_color').asVec4().set(color);

            this.colorProgram.getAttribute('a_position').set(this.vertexBuffer, 3, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        });
    }

    public rectangle(left: number, top: number, right: number, bottom: number, color: Vec4Like): void {
        const { gl } = this.glContext;

        this.colorProgram.use(() => {
            this.setMeshRect(this.colorProgram, left, top, right, bottom);
            this.setMatrices(this.colorProgram);
            this.colorProgram.getUniform('u_color').asVec4().set(color);

            const position = this.colorProgram.getAttribute('a_position');
            position.set(this.vertexBuffer, 3, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }

    public rectangleGradient2(left: number, top: number, right: number, bottom: number, color1: Vec4Like, color2: Vec4Like, dir: Vec2): void {
        const { gl } = this.glContext;

        this.gradientRectProgram.use(() => {
            this.setMeshRect(this.gradientRectProgram, left, top, right, bottom);
            this.setMatrices(this.gradientRectProgram);
            this.gradientRectProgram.getUniform('u_color1').asVec4().set(color1);
            this.gradientRectProgram.getUniform('u_color2').asVec4().set(color2);
            this.gradientRectProgram.getUniform('u_dir').asVec2().set(dir);

            const position = this.gradientRectProgram.getAttribute('a_position');
            position.set(this.vertexBuffer, 3, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }

    public rectangleStroke(left: number, top: number, right: number, bottom: number, color: Vec4Like, width: number, side: 'outer' | 'inner' | 'middle' = 'middle'): void {
        const { gl } = this.glContext;
        width /= 2;

        const expand = side === 'inner'
            ? 0
            : side === 'middle'
                ? width / 2
                : width;
        const bounds = new AABB2(new Vec2(left, top), new Vec2(right, bottom)).expand(
            { x: expand, y: expand },
        );
        const { min, max } = bounds;

        this.colorProgram.use(() => {
            this.setMesh(this.colorProgram, new Float32Array([
                // top
                min.x - width, min.y - width, 0,
                max.x - width, min.y - width, 0,
                max.x - width, min.y + width, 0,
                min.x - width, min.y - width, 0,
                max.x - width, min.y + width, 0,
                min.x - width, min.y + width, 0,
                // right
                max.x - width, min.y - width, 0,
                max.x + width, min.y - width, 0,
                max.x + width, max.y - width, 0,
                max.x - width, min.y - width, 0,
                max.x + width, max.y - width, 0,
                max.x - width, max.y - width, 0,
                // bottom
                min.x + width, max.y - width, 0,
                max.x + width, max.y - width, 0,
                max.x + width, max.y + width, 0,
                min.x + width, max.y - width, 0,
                max.x + width, max.y + width, 0,
                min.x + width, max.y + width, 0,
                // left
                min.x - width, min.y + width, 0,
                min.x + width, min.y + width, 0,
                min.x + width, max.y + width, 0,
                min.x - width, min.y + width, 0,
                min.x + width, max.y + width, 0,
                min.x - width, max.y + width, 0,
            ]));
            this.setMatrices(this.colorProgram);

            this.colorProgram.getUniform('u_color').asVec4().set(color);
            gl.drawArrays(gl.TRIANGLES, 0, 24);
        });
    }

    public texture(left: number, top: number, right: number, bottom: number, texture: GlTexture, color: Vec4Like = Vec4.ONE, uv: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    } | null = null): void {
        const { gl } = this.glContext;

        this.textureProgram.use(() => {
            this.setMesh(
                this.textureProgram, new Float32Array([
                    left, top, 0,
                    right, top, 0,
                    right, bottom, 0,
                    left, top, 0,
                    right, bottom, 0,
                    left, bottom, 0,
                ]),
                uv ? new Float32Array([
                    uv.left, uv.top,
                    uv.right, uv.top,
                    uv.right, uv.bottom,
                    uv.left, uv.top,
                    uv.right, uv.bottom,
                    uv.left, uv.bottom,
                ]) : new Float32Array([
                    0, 0,
                    1, 0,
                    1, 1,
                    0, 0,
                    1, 1,
                    0, 1,
                ]),
            );
            this.setMatrices(this.textureProgram);

            this.textureProgram.getUniform('u_texture').asSampler2D().set(texture);
            this.textureProgram.getUniform('u_color').asVec4().set(color);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }

    public textureUV(left: number, top: number, right: number, bottom: number, texture: GlTexture, uvLeft: number, uvTop: number, uvRight: number, uvBottom: number, color: Vec4Like = Vec4.ONE): void {
        const { gl } = this.glContext;

        this.textureProgram.use(() => {
            this.setMesh(
                this.textureProgram,
                new Float32Array([
                    left, top, 0,
                    right, top, 0,
                    right, bottom, 0,
                    left, top, 0,
                    right, bottom, 0,
                    left, bottom, 0,
                ]), new Float32Array([
                    uvLeft, uvTop,
                    uvRight, uvTop,
                    uvRight, uvBottom,
                    uvLeft, uvTop,
                    uvRight, uvBottom,
                    uvLeft, uvBottom,
                ]));
            this.setMatrices(this.textureProgram);

            this.textureProgram.getUniform('u_texture').asSampler2D().set(texture);
            this.textureProgram.getUniform('u_color').asVec4().set(color);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }

    public textureMask(left: number, top: number, right: number, bottom: number, texture: GlTexture, mask: GlTexture, color = Vec4.ONE): void {
        const { gl } = this.glContext;

        this.textureMaskProgram.use(() => {
            this.setMeshRect(this.textureMaskProgram, left, top, right, bottom);
            this.setMatrices(this.textureMaskProgram);

            this.textureMaskProgram.getUniform('u_texture').asSampler2D().set(texture);
            this.textureMaskProgram.getUniform('u_mask').asSampler2D().set(mask);
            this.textureMaskProgram.getUniform('u_color').asVec4().set(color);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }

    public textureColor(left: number, top: number, right: number, bottom: number, texture: GlTexture, color: Vec4Like, uv: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    } | null = null): void {
        const { gl } = this.glContext;

        this.textureColorProgram.use(() => {
            this.setMesh(
                this.textureColorProgram,
                new Float32Array([
                    left, top, 0,
                    right, top, 0,
                    right, bottom, 0,
                    left, top, 0,
                    right, bottom, 0,
                    left, bottom, 0,
                ]),
                uv ? new Float32Array([
                    uv.left, uv.top,
                    uv.right, uv.top,
                    uv.right, uv.bottom,
                    uv.left, uv.top,
                    uv.right, uv.bottom,
                    uv.left, uv.bottom,
                ]) : new Float32Array([
                    0, 0,
                    1, 0,
                    1, 1,
                    0, 0,
                    1, 1,
                    0, 1,
                ]),
            );
            this.setMatrices(this.textureColorProgram);

            this.textureColorProgram.getUniform('u_texture').asSampler2D().set(texture);
            this.textureColorProgram.getUniform('u_color').asVec4().set(color);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }

    public textureOutline(left: number, top: number, right: number, bottom: number, texture: GlTexture, color: Vec4Like, outlineWidth: number, uv: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    } | null = null): void {
        const { gl } = this.glContext;

        const width = right - left;
        const height = bottom - top;
        const margin = outlineWidth;
        const uvMargin = {
            x: margin / width,
            y: margin / height,
        };

        this.textureOutlineProgram.use(() => {
            this.setMesh(
                this.textureOutlineProgram,
                new Float32Array([
                    left - margin, top - margin, 0,
                    left + width + margin, top - margin, 0,
                    left + width + margin, bottom + margin, 0,
                    left - margin, top - margin, 0,
                    left + width + margin, bottom + margin, 0,
                    left - margin, bottom + margin, 0,
                ]),
                uv ? new Float32Array([
                    uv.left - uvMargin.x, uv.top - uvMargin.y,
                    uv.right + uvMargin.x, uv.top - uvMargin.y,
                    uv.right + uvMargin.x, uv.bottom + uvMargin.y,
                    uv.left - uvMargin.x, uv.top - uvMargin.y,
                    uv.right + uvMargin.x, uv.bottom + uvMargin.y,
                    uv.left - uvMargin.x, uv.bottom + uvMargin.y,
                ]) : new Float32Array([
                    -uvMargin.x, -uvMargin.y,
                    1 + uvMargin.x, -uvMargin.y,
                    1 + uvMargin.x, 1 + uvMargin.y,
                    -uvMargin.x, -uvMargin.y,
                    1 + uvMargin.x, 1 + uvMargin.y,
                    -uvMargin.x, 1 + uvMargin.y,
                ]),
            );
            this.setMatrices(this.textureOutlineProgram);

            this.textureOutlineProgram.getUniform('u_texture').asSampler2D().set(texture);
            this.textureOutlineProgram.getUniform('u_outlineColor').asVec4().set(color);
            this.textureOutlineProgram.getUniform('u_resolution').asVec2().set({ x: right - left, y: bottom - top });
            const mvp = this.matrices.get();
            this.textureOutlineProgram.getUniform('u_outlineWidth').asFloat().set(outlineWidth / mvp.m00 / gl.canvas.width);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }

    public bezierCurve(
        a: Vec2Like,
        b: Vec2Like,
        c: Vec2Like,
        color: Vec4Like,
        widthIn: number,
        widthOut: number,
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

        this.bezierProgram.use(() => {
            this.setMesh(this.bezierProgram, new Float32Array([
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
            this.setMatrices(this.bezierProgram);

            this.bezierProgram.getUniform('u_resolution').asVec2().set({ x: width, y: height });
            this.bezierProgram.getUniform('u_color').asVec4().set(color);
            this.bezierProgram.getUniform('u_widthIn').asFloat().set(widthIn);
            this.bezierProgram.getUniform('u_widthOut').asFloat().set(widthOut);
            this.bezierProgram.getUniform('p1').asVec2().set(Vec2.from(a).sub(bounds.min));
            this.bezierProgram.getUniform('p2').asVec2().set(Vec2.from(b).sub(bounds.min));
            this.bezierProgram.getUniform('p3').asVec2().set(Vec2.from(c).sub(bounds.min));
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }

    public circle(
        x: number,
        y: number,
        radiusInner: number,
        radiusOuter: number,
        color: Vec4Like,
        smoothness: number = 1.0,
        dir: number = 0,
        angle: number = 1,
    ): void {
        const { gl } = this.glContext;
        radiusInner *= 2;
        radiusOuter *= 2;

        this.circleProgram.use(() => {
            this.setMesh(this.circleProgram, new Float32Array([
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
            this.setMatrices(this.circleProgram);

            this.circleProgram.getUniform('u_resolution').asVec2().set({ x: radiusOuter * 2, y: radiusOuter * 2 });
            this.circleProgram.getUniform('u_color').asVec4().set(color);
            this.circleProgram.getUniform('u_radiusInner').asFloat().set(radiusInner);
            this.circleProgram.getUniform('u_radiusOuter').asFloat().set(radiusOuter);
            this.circleProgram.getUniform('u_smoothness').asFloat().set(smoothness);
            this.circleProgram.getUniform('u_angle').asFloat().set(lerp(Math.PI, -Math.PI, angle));
            this.circleProgram.getUniform('u_direction').asVec2().set({
                x: Math.sin(dir - Math.PI / 2),
                y: Math.cos(dir - Math.PI / 2),
            });
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }

    public circleTex(
        x: number,
        y: number,
        radiusInner: number,
        radiusOuter: number,
        texture: GlTexture,
        color: Vec4 = Vec4.ONE,
        smoothness: number = 1.0,
    ): void {
        const { gl } = this.glContext;
        radiusInner /= 2;
        radiusOuter /= 2;

        this.circleTextureProgram.use(() => {
            this.setMeshRect(this.circleTextureProgram, x - radiusOuter, y - radiusOuter, x + radiusOuter, y + radiusOuter);
            this.setMatrices(this.circleTextureProgram);

            this.circleTextureProgram.getUniform('u_resolution').asVec2().set({ x: radiusOuter * 2, y: radiusOuter * 2 });
            this.circleTextureProgram.getUniform('u_color').asVec4().set(color);
            this.circleTextureProgram.getUniform('u_radiusInner').asFloat().set(radiusInner / 2);
            this.circleTextureProgram.getUniform('u_radiusOuter').asFloat().set(radiusOuter / 2);
            this.circleTextureProgram.getUniform('u_smoothness').asFloat().set(smoothness);
            this.circleTextureProgram.getUniform('u_texture').asSampler2D().set(texture);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }

    public roundedRectTexture(
        start: Vec2Like,
        end: Vec2Like,
        radius: number,
        texture: GlTexture,
        color: Vec4 = Vec4.ONE,
        smoothness: number = 1.0,
    ): void {
        const { gl } = this.glContext;

        this.roundedRectTextureProgram.use(() => {
            this.setMeshRect(this.roundedRectTextureProgram, start.x, start.y, end.x, end.y);
            this.setMatrices(this.roundedRectTextureProgram);
            this.roundedRectTextureProgram.getUniform('u_color').asVec4().set(color);
            this.roundedRectTextureProgram.getUniform('u_resolution').asVec2().set(Vec2.from(end).sub(start));
            this.roundedRectTextureProgram.getUniform('u_radius').asFloat().set(radius);
            this.roundedRectTextureProgram.getUniform('u_smoothness').asFloat().set(smoothness);
            this.roundedRectTextureProgram.getUniform('u_texture').asSampler2D().set(texture);

            const position = this.roundedRectTextureProgram.getAttribute('a_position');
            position.set(this.vertexBuffer, 3, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }

    public roundedRect(
        start: Vec2,
        end: Vec2,
        radius: number,
        color: Vec4 = Vec4.ONE,
        width?: number,
        smoothness: number = 1.0,
    ): void {
        const { gl } = this.glContext;

        this.roundedRectProgram.use(() => {
            this.setMeshRect(this.roundedRectProgram, start.x, start.y, end.x, end.y);
            this.setMatrices(this.roundedRectProgram);
            this.roundedRectProgram.getUniform('u_color').asVec4().set(color);
            this.roundedRectProgram.getUniform('u_resolution').asVec2().set(end.sub(start));
            this.roundedRectProgram.getUniform('u_width').asFloat().set(width ?? Math.max(end.x - start.x, end.y - start.y));
            this.roundedRectProgram.getUniform('u_radius').asFloat().set(radius);
            this.roundedRectProgram.getUniform('u_smoothness').asFloat().set(smoothness);

            const position = this.roundedRectProgram.getAttribute('a_position');
            position.set(this.vertexBuffer, 3, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }

    private getBlurWeight(): Float32Array {
        const weightCount = 32;
        const weights = new Float32Array(weightCount);
        const sigma = weightCount / 6;
        let sum = 0;
        for (let i = 0; i < weightCount; i++) {
            const x = i / weightCount * 6 - 3;
            const weight = Math.exp(-0.5 * (x / sigma) ** 2);
            weights[i] = weight;
            sum += weight;
        }
        for (let i = 0; i < weightCount; i++) {
            weights[i] /= sum;
        }
        return weights;
    }

    public blurTextureStep(left: number, top: number, right: number, bottom: number, tex: GlTexture, radius: number, dir: Vec2Like, color: Vec4Like = Vec4.ONE): void {
        const bounds = new AABB2(new Vec2(left, top), new Vec2(right, bottom));
        const { gl } = this.glContext;

        this.blurProgram.use(() => {
            this.setMeshRect(this.blurProgram, left, top, right, bottom);
            this.setMatrices(this.blurProgram);

            const weights = this.getBlurWeight();
            this.blurProgram.getUniform('u_weight[0]').asFloatArray().set(weights);
            this.blurProgram.getUniform('u_weightCount').asFloat().set(weights.length);
            this.blurProgram.getUniform('u_radius').asFloat().set(radius);
            this.blurProgram.getUniform('u_texture').asSampler2D().set(tex);
            this.blurProgram.getUniform('u_resolution').asVec2().set(bounds.size);
            this.blurProgram.getUniform('u_dir').asVec2().set(dir);
            this.blurProgram.getUniform('u_color').asVec4().set(color);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }

    public blurTexture(left: number, top: number, right: number, bottom: number, tex: GlTexture, radius: number): void {
        const bounds = new AABB2(new Vec2(left, top), new Vec2(right, bottom));
        const size = bounds.size;
        this.frameBufferTexture.use(() => {
            this.frameBufferTexture.ensureSize(bounds.size.x, bounds.size.y);
        });

        const { stateManager } = this.glContext;
        this.frameBuffer.use(() => {
            stateManager.pushViewport(size);
            this.matrices.push();
            this.matrices.identity();
            this.matrices.projection.orthographic(0, 0, size.x, size.y, -1, 1);
            this.blurTextureStep(0, 0, size.x, size.y, tex, radius, { x: 1, y: 0 });
            this.matrices.pop();
            stateManager.popViewport();
        });

        this.blurTextureStep(left, top, right, bottom, this.frameBufferTexture, radius, { x: 0, y: 1 });
    }

    public thresholdTexture(left: number, top: number, right: number, bottom: number, tex: GlTexture, threshold: number) {
        const { gl } = this.glContext;

        this.thresholdProgram.use(() => {
            this.setMeshRect(this.thresholdProgram, left, top, right, bottom);
            this.setMatrices(this.thresholdProgram);

            this.thresholdProgram.getUniform('u_texture').asSampler2D().set(tex);
            this.thresholdProgram.getUniform('u_threshold').asFloat().set(threshold);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    }
}
