export class GLStateManager {
    private program: GlProgram | null = null;
    private buffer: GlBuffer | null = null;

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

export class ProgramUniform {
    constructor(
        public readonly gl: WebGL2RenderingContext,
        public readonly location: WebGLUniformLocation,
    ) {}

    public static create(
        gl: WebGL2RenderingContext,
        program: WebGLProgram,
        name: string,
    ): ProgramUniform {
        const location = gl.getUniformLocation(program, name);
        if (location == null) {
            throw new Error(`Uniform not found: ${name}`);
        }
        return new ProgramUniform(gl, location);
    }

    public set1f(value: number): void {
        this.gl.uniform1f(this.location, value);
    }

    public set3f(x: number, y: number, z: number): void {
        this.gl.uniform3f(this.location, x, y, z);
    }
}

export class GlProgram {
    constructor(
        private readonly stateManager: GLStateManager,
        public readonly gl: WebGL2RenderingContext,
        public readonly program: WebGLProgram,
    ) {}

    public static create(stateManager: GLStateManager, gl: WebGL2RenderingContext): GlProgram {
        const program = gl.createProgram();
        if (program == null) {
            throw new Error('Failed to create program');
        }
        return new GlProgram(stateManager, gl, program);
    }

    public attachShader(shader: GlShader): void {
        this.gl.attachShader(this.program, shader.shader);
    }

    public link(): void {
        this.gl.linkProgram(this.program);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            const info = this.gl.getProgramInfoLog(this.program);
            this.gl.deleteProgram(this.program);
            throw new Error(`Failed to link program: ${info}`);
        }
    }

    public use(callback: () => void): void {
        this.stateManager.useProgram(this, () => {
            this.gl.useProgram(this.program);
            callback();
        });
    }

    public getUniform(name: string): ProgramUniform {
        if (!this.stateManager.isProgramActive(this)) {
            throw new Error('Program not active');
        }
        return ProgramUniform.create(this.gl, this.program, name);
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
        switch (usage) {
        case 'static':
            this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);
            break;
        case 'dynamic':
            this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.DYNAMIC_DRAW);
            break;
        case 'stream':
            this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STREAM_DRAW);
            break;
        }
    }

    public setSubData(data: AllowSharedBufferSource, offset: number): void {
        if (!this.stateManager.isBufferBound(this)) {
            throw new Error('Buffer not bound');
        }
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, offset, data);
    }
}

export class GlContext {
    private readonly stateManager = new GLStateManager();

    constructor(public readonly gl: WebGL2RenderingContext) {}

    public destroy(): void {}

    public static create(canvas: HTMLCanvasElement): GlContext {
        const gl = canvas.getContext('webgl2');
        if (gl == null) {
            throw new Error('WebGL2 not supported');
        }
        return new GlContext(gl);
    }

    public createProgram(shaders: GlShader[]): GlProgram {
        const program = GlProgram.create(this.stateManager, this.gl);
        for (const shader of shaders) {
            program.attachShader(shader);
        }
        program.link();
        return program;
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
}
