import type { Mat2 } from '$lib/math/mat2.js';
import type { Mat3 } from '$lib/math/mat3.js';
import type { Mat4 } from '$lib/math/mat4.js';
import { Vec2, type Vec2Like } from '$lib/math/vec2.js';
import type { Vec3 } from '$lib/math/vec3.js';
import type { Vec4Like } from '$lib/math/vec4.js';

export class GLStateManager {
    public static readonly TEXTURE_UNITS = 32;
    private program: GlProgram | null = null;
    private buffer: GlBuffer | null = null;
    private frameBufferStack: GlFramebuffer[] = [];
    private textures: Array<GlTexture | null> = [];
    private viewportStack: Vec2Like[] = [Vec2.ZERO];
    private activeTexture = -1;

    constructor(public readonly gl: WebGL2RenderingContext) {}

    public setViewport(dimentions: Vec2Like) {
        this.viewportStack[this.viewportStack.length - 1] = dimentions;
        this.gl.viewport(0, 0, dimentions.x, dimentions.y);
    }

    public pushViewport(dimentions: Vec2Like) {
        if (this.viewportStack.length >= 100) {
            console.warn('Viewport stack overflow (>=100)')
        }
        this.viewportStack.push(dimentions);
        this.gl.viewport(0, 0, dimentions.x, dimentions.y);
    }
    
    public popViewport() {
        this.viewportStack.pop();
        if (this.viewportStack.length <= 0) {
            console.warn('Viewport stack underflow (<=0)');
        }
        const dimentions = this.viewportStack[this.viewportStack.length - 1];
        this.gl.viewport(0, 0, dimentions.x, dimentions.y);
    }

    public useProgram(program: GlProgram, callback: () => void): void {
        if (this.program != null) {
            throw new Error('Program already in use');
        }
        this.program = program;
        callback();
        this.program = null;
    }

    public isProgramActive(program: GlProgram): boolean {
        return this.program === program;
    }

    public bindBuffer(buffer: GlBuffer, callback: () => void): void {
        if (this.buffer != null) {
            throw new Error('Buffer already bound');
        }
        this.buffer = buffer;
        callback();
        this.buffer = null;
    }

    public isBufferBound(buffer: GlBuffer): boolean {
        return this.buffer === buffer;
    }

    public bindFramebuffer(framebuffer: GlFramebuffer, callback: () => void): void {
        const index = this.frameBufferStack.findIndex((it) => it === framebuffer);
        if (index !== -1) {
            throw new Error('Framebuffer already bound');
        }
        this.frameBufferStack.push(framebuffer);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer.framebuffer);
        callback();
        this.frameBufferStack.pop();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBufferStack[this.frameBufferStack.length - 1]?.framebuffer ?? null);
    }

    public async bindFramebufferAsync(framebuffer: GlFramebuffer, callback: () => Promise<void>): Promise<void> {
        const index = this.frameBufferStack.findIndex((it) => it === framebuffer);
        if (index !== -1) {
            throw new Error('Framebuffer already bound');
        }
        this.frameBufferStack.push(framebuffer);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer.framebuffer);
        await callback();
        this.frameBufferStack.pop();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBufferStack[this.frameBufferStack.length - 1]?.framebuffer ?? null);
    }

    public isFramebufferBound(framebuffer: GlFramebuffer): boolean {
        return this.frameBufferStack.includes(framebuffer);
    }

    public useTexture(
        texture: GlTexture,
        callback: (index: number) => void,
    ): void {
        const activeTexture = this.activeTexture += 1;
        if (activeTexture >= GLStateManager.TEXTURE_UNITS) {
            throw new Error('Too many textures bound');
        }
        this.textures[activeTexture] = texture;
        this.gl.activeTexture(this.gl.TEXTURE0 + activeTexture);
        callback(activeTexture);
        this.textures[activeTexture] = null;
        this.activeTexture = activeTexture - 1;
    }

    public bindTexture(texture: GlTexture): { index: number, unbind: () => void } {
        const activeTexture = this.activeTexture += 1;
        if (activeTexture >= GLStateManager.TEXTURE_UNITS) {
            throw new Error('Too many textures bound');
        }
        this.textures[activeTexture] = texture;
        this.gl.activeTexture(this.gl.TEXTURE0 + activeTexture);
        return {
            index: activeTexture,
            unbind: () => {
                this.textures[activeTexture] = null;
                this.activeTexture -= 1;
            },
        };
    }

    public isTextureBound(texture: GlTexture): boolean {
        return this.textures[this.activeTexture] === texture;
    }
}

export type ShaderType = 'vertex' | 'fragment';

export type ShaderSource = {
    source: string;
    type: ShaderType;
};

export class GlShader {
    constructor(
        public readonly gl: WebGL2RenderingContext,
        public readonly shader: WebGLShader,
    ) {}

    public static create(gl: WebGL2RenderingContext, type: number, source: string): GlShader {
        const shader = gl.createShader(type);
        if (shader == null) {
            throw new Error('Failed to create shader');
        }

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(`Failed to compile shader: ${info}`);
        }

        return new GlShader(gl, shader);
    }
}

export type GlType = 'int' | 'float' | 'vec2' | 'vec3' | 'vec4' | 'mat2' | 'mat3' | 'mat4' | 'sampler2d';


export type Uniform<T> = {
    set: (value: T) => void;
    release: () => void;
}

export class ProgramUniform {
    constructor(
        public readonly gl: WebGL2RenderingContext,
        public readonly location: WebGLUniformLocation,
        public readonly type: GlType,
        public readonly offset: number,
        public readonly size: number,
    ) {}

    public release: () => void = () => {};

    private as<T>(type: GlType, set: (value: T) => void): Uniform<T> {
        if (this.type !== type) {
            throw new Error(`Uniform is not a ${type}`);
        }
        return { set, release: () => this.release() };
    }

    public asInt(): Uniform<number> {
        return this.as('int', (value) => {
            this.gl.uniform1i(this.location, value);
        });
    }

    public asFloat(): Uniform<number> {
        return this.as('float', (value) => {
            this.gl.uniform1f(this.location, value);
        });
    }

    public asFloatArray(): Uniform<Iterable<GLfloat>> {
        return this.as('float', (value) => {
            this.gl.uniform1fv(this.location, value);
        });
    }

    public asVec2(): Uniform<Vec2Like> {
        return this.as('vec2', (value) => {
            this.gl.uniform2f(this.location, value.x, value.y);
        });
    }

    public asVec3(): Uniform<Vec3> {
        return this.as('vec3', (value) => {
            this.gl.uniform3f(this.location, value.x, value.y, value.z);
        });
    }

    public asVec4(): Uniform<Vec4Like> {
        return this.as('vec4', (value) => {
            this.gl.uniform4f(this.location, value.x, value.y, value.z, value.w);
        });
    }

    public asMat2(): Uniform<Mat2> {
        return this.as('mat2', (value) => {
            this.gl.uniformMatrix2fv(this.location, false, value.elements);
        });
    }

    public asMat3(): Uniform<Mat3> {
        return this.as('mat3', (value) => {
            this.gl.uniformMatrix3fv(this.location, false, value.elements);
        });
    }

    public asMat4(): Uniform<Mat4> {
        return this.as('mat4', (value) => {
            this.gl.uniformMatrix4fv(this.location, false, value.elements);
        });
    }

    public asSampler2D(): Uniform<GlTexture> {
        return this.as('sampler2d', (value) => {
            const { index, unbind } = value.bind();
            this.gl.uniform1i(this.location, index);
            this.release = unbind;
        });
    }
}

export class AttribLocation {
    constructor(
        public readonly gl: WebGL2RenderingContext,
        public readonly location: number,
        public readonly type: GlType,
        public readonly offset: number,
        public readonly size: number,
    ) {}

    public enable(): void {
        this.gl.enableVertexAttribArray(this.location);
    }

    public pointer(size: number, type: number, normalized: boolean, stride: number, offset: number): void {
        this.gl.vertexAttribPointer(this.location, size, type, normalized, stride, offset);
    }

    public set(
        buffer: GlBuffer,
        size: number,
        type: number,
        normalized: boolean,
        stride: number,
        offset: number,
    ): void {
        buffer.bind(() => {
            this.enable();
            this.pointer(size, type, normalized, stride, offset);
        });
    }
}

export class GlProgram {
    public uniforms: ReadonlyMap<string, ProgramUniform>;
    public attributes: ReadonlyMap<string, AttribLocation>;

    constructor(
        private readonly stateManager: GLStateManager,
        public readonly gl: WebGL2RenderingContext,
        public readonly program: WebGLProgram,
    ) {
        const uniforms = new Map<string, ProgramUniform>();
        const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        const indices = [...Array(count).keys()];
        const offsets = gl.getActiveUniforms(program, indices, gl.UNIFORM_OFFSET);

        const TYPE_MAP: Record<number, GlType> = {
            [gl.INT]: 'int',
            [gl.FLOAT]: 'float',
            [gl.FLOAT_VEC2]: 'vec2',
            [gl.FLOAT_VEC3]: 'vec3',
            [gl.FLOAT_VEC4]: 'vec4',
            [gl.FLOAT_MAT2]: 'mat2',
            [gl.FLOAT_MAT3]: 'mat3',
            [gl.FLOAT_MAT4]: 'mat4',
            [gl.SAMPLER_2D]: 'sampler2d',
        };

        for (let i = 0; i < count; i++) {
            const info = gl.getActiveUniform(program, i);
            if (info == null) {
                throw new Error('Uniform info not found');
            }
            const { name, type, size } = info;
            const offset = offsets[i];
            const location = gl.getUniformLocation(program, name);
            if (location == null) {
                throw new Error('Uniform location not found');
            }
            const uniform = new ProgramUniform(gl, location, TYPE_MAP[type], offset, size);
            uniforms.set(name, uniform);
        }
        this.uniforms = uniforms;

        const attributes = new Map<string, AttribLocation>();
        const attribCount = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < attribCount; i++) {
            const info = gl.getActiveAttrib(program, i);
            if (info == null) {
                throw new Error('Attribute info not found');
            }
            const { name, type, size } = info;
            const location = new AttribLocation(gl, gl.getAttribLocation(program, name), TYPE_MAP[type], 0, size);
            attributes.set(name, location);
        }
        this.attributes = attributes;
    }

    public static create(
        stateManager: GLStateManager,
        gl: WebGL2RenderingContext,
        shaders: GlShader[],
    ): GlProgram {
        const program = gl.createProgram();
        if (program == null) {
            throw new Error('Failed to create program');
        }
        for (const shader of shaders) {
            gl.attachShader(program, shader.shader);
        }
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error(`Failed to link program: ${info}`);
        }
        return new GlProgram(stateManager, gl, program);
    }

    public use(callback: () => void): void {
        this.stateManager.useProgram(this, () => {
            this.gl.useProgram(this.program);
            callback();
            this.uniforms.forEach((uniform) => {
                uniform.release();
            });
        });
    }

    public getUniform(name: string): ProgramUniform {
        if (!this.stateManager.isProgramActive(this)) {
            throw new Error('Program not active');
        }
        const uniform = this.uniforms.get(name);
        if (uniform == null) {
            throw new Error(`Uniform not found: ${name}`);
        }
        return uniform;
    }

    public getAttribute(name: string): AttribLocation {
        if (!this.stateManager.isProgramActive(this)) {
            throw new Error('Program not active');
        }
        const attribute = this.attributes.get(name);
        if (attribute == null) {
            throw new Error(`Attribute not found: ${name}`);
        }
        return attribute;
    }
}

export type BufferUsage = 'static' | 'dynamic' | 'stream';

export class GlBuffer {
    constructor(
        private readonly stateManager: GLStateManager,
        public readonly gl: WebGL2RenderingContext,
        public readonly buffer: WebGLBuffer,
    ) {}

    public static create(stateManager: GLStateManager, gl: WebGL2RenderingContext): GlBuffer {
        const buffer = gl.createBuffer();
        if (buffer == null) {
            throw new Error('Failed to create buffer');
        }
        return new GlBuffer(stateManager, gl, buffer);
    }

    public bind(callback: () => void): void {
        this.stateManager.bindBuffer(this, () => {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
            callback();
        });
    }

    public setData(data: AllowSharedBufferSource, usage: BufferUsage): void {
        if (!this.stateManager.isBufferBound(this)) {
            throw new Error('Buffer not bound');
        }
        const USAGE_MAP: Record<BufferUsage, number> = {
            static: this.gl.STATIC_DRAW,
            dynamic: this.gl.DYNAMIC_DRAW,
            stream: this.gl.STREAM_DRAW,
        };
        this.gl.bufferData(this.gl.ARRAY_BUFFER, data, USAGE_MAP[usage]);
    }

    public setSubData(data: AllowSharedBufferSource, offset: number): void {
        if (!this.stateManager.isBufferBound(this)) {
            throw new Error('Buffer not bound');
        }
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, offset, data);
    }
}

export type TextureParams = {
    wrapS?: 'clamp-to-edge' | 'repeat' | 'mirrored-repeat';
    wrapT?: 'clamp-to-edge' | 'repeat' | 'mirrored-repeat';
    minFilter?: 'nearest' | 'linear' | 'nearest-mipmap-nearest' | 'linear-mipmap-nearest' | 'nearest-mipmap-linear' | 'linear-mipmap-linear';
    magFilter?: 'nearest' | 'linear' | 'nearest-mipmap-nearest' | 'linear-mipmap-nearest' | 'nearest-mipmap-linear' | 'linear-mipmap-linear';
};

export type ColorFormat = 'rgba' | 'rgb' | 'rgba16f' | 'rgb16f' | 'srgb' | 'srgb8' | 'srgb8alpha8';

export class GlTexture {
    constructor(
        public readonly stateManager: GLStateManager,
        public readonly gl: WebGL2RenderingContext,
        public readonly texture: WebGLTexture,
        public width: number = 0,
        public height: number = 0,
    ) {}

    public static create(stateManager: GLStateManager, gl: WebGL2RenderingContext): GlTexture {
        const texture = gl.createTexture();
        if (texture == null) {
            throw new Error('Failed to create texture');
        }
        return new GlTexture(stateManager, gl, texture);
    }

    public use(callback: (index: number) => void): void {
        this.stateManager.useTexture(this, (index: number) => {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
            callback(index);
        });
    }

    public bind(): Disposable & { index: number, unbind: () => void } {
        const { index, unbind } = this.stateManager.bindTexture(this);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        return {
            index,
            unbind,
            [Symbol.dispose]: () => {
                unbind();
            },
        };
    }
        

    public setImage(image: TexImageSource, params: {
        internalFormat: ColorFormat;
        format?: ColorFormat;
        width: number;
        height: number;
    }): void {
        if (!this.stateManager.isTextureBound(this)) {
            throw new Error('Texture not bound');
        }
        const { internalFormat, width, height } = params;
        this.width = width;
        this.height = height;
        const COLOR_FORMATS: Record<ColorFormat, number> = {
            rgba: this.gl.RGBA,
            rgb: this.gl.RGB,
            rgba16f: this.gl.RGBA16F,
            rgb16f: this.gl.RGB16F,
            srgb: this.gl.SRGB,
            srgb8: this.gl.SRGB8,
            srgb8alpha8: this.gl.SRGB8_ALPHA8,
        };
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            COLOR_FORMATS[internalFormat],
            width,
            height,
            0,
            COLOR_FORMATS[params.format ?? internalFormat],
            this.gl.UNSIGNED_BYTE,
            image
        );
    }

    public setParams(params: TextureParams): void {
        if (!this.stateManager.isTextureBound(this)) {
            throw new Error('Texture not bound');
        }
        const FILTERS: Record<string, number> = {
            nearest: this.gl.NEAREST,
            linear: this.gl.LINEAR,
            'nearest-mipmap-nearest': this.gl.NEAREST_MIPMAP_NEAREST,
            'linear-mipmap-nearest': this.gl.LINEAR_MIPMAP_NEAREST,
            'nearest-mipmap-linear': this.gl.NEAREST_MIPMAP_LINEAR,
            'linear-mipmap-linear': this.gl.LINEAR_MIPMAP_LINEAR,
        };
        const WRAPS: Record<string, number> = {
            'clamp-to-edge': this.gl.CLAMP_TO_EDGE,
            repeat: this.gl.REPEAT,
            'mirrored-repeat': this.gl.MIRRORED_REPEAT,
        };
        if (params.wrapS != null) {
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, WRAPS[params.wrapS]);
        }
        if (params.wrapT != null) {
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, WRAPS[params.wrapT]);
        }
        if (params.minFilter != null) {
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, FILTERS[params.minFilter]);
        }
        if (params.magFilter != null) {
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, FILTERS[params.magFilter]);
        }
    }

    public ensureSize(width: number, height: number): void {
        if (!this.stateManager.isTextureBound(this)) {
            throw new Error('Texture not bound');
        }
        if (width !== this.width || height !== this.height) {
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
            this.width = width;
            this.height = height;
        }
    }
}

export class GlFramebuffer {

    constructor(
        public readonly stateManager: GLStateManager,
        public readonly gl: WebGL2RenderingContext,
        public readonly framebuffer: WebGLFramebuffer,
    ) {
    }

    public static create(stateManager: GLStateManager, gl: WebGL2RenderingContext): GlFramebuffer {
        const framebuffer = gl.createFramebuffer();
        if (framebuffer == null) {
            throw new Error('Failed to create framebuffer');
        }
        return new GlFramebuffer(stateManager, gl, framebuffer);
    }

    public use(callback: () => void): void {
        this.stateManager.bindFramebuffer(this, () => {
            callback();
        });
    }

    public async useAsync(callback: () => Promise<void>): Promise<void> {
        await this.stateManager.bindFramebufferAsync(this, async () => {
            await callback();
        });
    }
    
    public attachTexture(texture: GlTexture | null): void {
        if (!this.stateManager.isFramebufferBound(this)) {
            throw new Error('Framebuffer not bound');
        }
        if (texture) {
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture.texture, 0);
        } else {
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, null, 0);
        }
    }
}

export class GlContext {
    public readonly stateManager: GLStateManager;

    constructor(public readonly gl: WebGL2RenderingContext) {
        this.stateManager = new GLStateManager(gl);
    }

    public destroy(): void {}

    public static create(canvas: HTMLCanvasElement | OffscreenCanvas): GlContext {
        const gl = canvas.getContext('webgl2', { premultipliedAlpha: false });
        if (gl == null) {
            throw new Error('WebGL2 not supported');
        }
        return new GlContext(gl);
    }

    public createProgram(shaders: GlShader[]): GlProgram {
        return GlProgram.create(this.stateManager, this.gl, shaders);
    }

    public createShader(source: ShaderSource): GlShader {
        let type: number;
        switch (source.type) {
        case 'vertex':
            type = this.gl.VERTEX_SHADER;
            break;
        case 'fragment':
            type = this.gl.FRAGMENT_SHADER;
            break;
        default:
            throw new Error(`Unsupported shader type: ${source.type}`);
        }
        return GlShader.create(this.gl, type, source.source);
    }

    public createBuffer(): GlBuffer {
        return GlBuffer.create(this.stateManager, this.gl);
    }

    public createTexture(): GlTexture {
        return GlTexture.create(this.stateManager, this.gl);
    }

    public createFramebuffer(): GlFramebuffer {
        return GlFramebuffer.create(this.stateManager, this.gl);
    }
}
