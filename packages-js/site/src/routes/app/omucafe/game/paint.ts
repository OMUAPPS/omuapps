import type { GlContext, GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext.js';
import { Vec2, type Vec2Like } from '$lib/math/vec2.js';
import { Vec4, type Vec4Like } from '$lib/math/vec4.js';
import { ByteReader, ByteWriter } from '@omujs/omu/bytebuffer.js';
import { getGame } from '../omucafe-app.js';
import { draw, getContext, matrices } from './game.js';
import { copy } from './helper.js';

export const DEFAULT_PEN = {
    color: {
        x: 0,
        y: 0,
        z: 0,
        w: 255,
    } as Vec4Like,
    opacity: 1,
    width: 10,
}

export type Pen = typeof DEFAULT_PEN;

export const DEFAULT_ERASER = {
    width: 40,
    opacity: 1,
}

export type Eraser = typeof DEFAULT_ERASER;

export const DEFAULT_TOOL = {
    type: 'move',
} as {
    type: 'move',
} | {
    type: 'pen',
} | {
    type: 'eraser',
}

export type Tool = typeof DEFAULT_TOOL;

export type DrawPath = {
    t: 'qb',
    in: number,
    out: number,
    a: Vec2Like,
    b: Vec2Like,
    c: Vec2Like,
}

export const PAINT_EVENT_TYPE = {
    PEN: 'dr',
    CHANGE_PEN: 'cp',
    ERASER: 'er',
    CHANGE_ERASER: 'ce',
    CLEAR: 'cl',
} as const;

export type PaintEvent = {
    // t: 'p',
    t: typeof PAINT_EVENT_TYPE.PEN,
    path: DrawPath,
} | {
    t: typeof PAINT_EVENT_TYPE.CHANGE_PEN,
    pen: Pen,
} | {
    t: typeof PAINT_EVENT_TYPE.ERASER,
    path: DrawPath,
} | {
    t: typeof PAINT_EVENT_TYPE.CHANGE_ERASER,
    eraser: Eraser,
} | {
    t: typeof PAINT_EVENT_TYPE.CLEAR,
}

export type PaintEvents = {
    data: string,
};

export class PaintBuffer {
    private static VERSION = 0;
    public static EMPTY = new PaintBuffer(PaintBuffer.VERSION, 0, new Uint8Array(0));
    
    constructor(
        public readonly version: number,
        public readonly size: number,
        public readonly buffer: Uint8Array,
    ) {}

    public static serialize(data: PaintBuffer): Uint8Array {
        const writer = new ByteWriter();
        writer.writeULEB128(data.version);
        writer.writeULEB128(data.size);
        writer.writeUint8Array(data.buffer);
        return writer.finish();
    }

    public static deserialize(data: Uint8Array): PaintBuffer {
        try {
            const reader = ByteReader.fromUint8Array(data);
            const version = reader.readULEB128();
            if (version < PaintBuffer.VERSION) {
                return PaintBuffer.EMPTY;
            }
            const size = reader.readULEB128();
            const buffer = reader.readUint8Array();
            reader.finish();
            return new PaintBuffer(version, size, buffer);
        } catch {
            return PaintBuffer.EMPTY;
        }
    }

    private writeVector2(writer: ByteWriter, vec: Vec2Like): void {
        writer.writeFloat32(vec.x);
        writer.writeFloat32(vec.y);
    }

    private readVector2(reader: ByteReader): Vec2Like {
        const x = reader.readFloat32();
        const y = reader.readFloat32();
        return new Vec2(x, y);
    }

    private writePath(writer: ByteWriter, path: DrawPath): void {
        writer.writeUint8(0);
        writer.writeFloat32(path.in);
        writer.writeFloat32(path.out);
        this.writeVector2(writer, path.a);
        this.writeVector2(writer, path.b);
        this.writeVector2(writer, path.c);
    }

    private readPath(reader: ByteReader): DrawPath {
        const type = reader.readUint8();
        if (type !== 0) {
            throw new Error(`Unexpected path type: ${type}`);
        }
        const inValue = reader.readFloat32();
        const outValue = reader.readFloat32();
        const a = this.readVector2(reader);
        const b = this.readVector2(reader);
        const c = this.readVector2(reader);
        return {
            t: 'qb',
            in: inValue,
            out: outValue,
            a,
            b,
            c,
        };
    }

    public push(...events: PaintEvent[]): PaintBuffer {
        const writer = ByteWriter.fromUint8Array(this.buffer);
        const TYPES = {
            [PAINT_EVENT_TYPE.PEN]: 0,
            [PAINT_EVENT_TYPE.CHANGE_PEN]: 1,
            [PAINT_EVENT_TYPE.ERASER]: 2,
            [PAINT_EVENT_TYPE.CHANGE_ERASER]: 3,
            [PAINT_EVENT_TYPE.CLEAR]: 4,
        };
        
        for (const event of events) {
            const { t } = event;
            const type = TYPES[t];
            writer.writeUint8(type);
            switch (t) {
                case PAINT_EVENT_TYPE.PEN:
                case PAINT_EVENT_TYPE.ERASER: {
                    const { path } = event;
                    this.writePath(writer, path);
                    break;
                }
                case PAINT_EVENT_TYPE.CHANGE_PEN:
                    writer.writeString(JSON.stringify(event));
                    break;
                case PAINT_EVENT_TYPE.CHANGE_ERASER:
                    writer.writeString(JSON.stringify(event));
                    break;
                case PAINT_EVENT_TYPE.CLEAR:
                    break;
            }
        }
        return new PaintBuffer(this.version, this.size + events.length, writer.finish());
    }

    public read(): PaintEvent[] {
        const reader = ByteReader.fromUint8Array(this.buffer);
        const events: PaintEvent[] = [];
        for (let i = 0; i < this.size; i++) {
            const type = reader.readUint8();
            switch (type) {
                case 0: {
                    const path = this.readPath(reader);
                    events.push({
                        t: PAINT_EVENT_TYPE.PEN,
                        path,
                    });
                    break;
                }
                case 1: {
                    events.push(JSON.parse(reader.readString()));
                    break;
                }
                case 2: {
                    const path = this.readPath(reader);
                    events.push({
                        t: PAINT_EVENT_TYPE.ERASER,
                        path,
                    });
                    break;
                }
                case 3: {
                    events.push(JSON.parse(reader.readString()));
                    break;
                }
                case 4:
                    events.push({
                        t: PAINT_EVENT_TYPE.CLEAR,
                    });
                    break;
            }
        }
        return events;
    }
}


export class Paint {
    public readonly texture: GlTexture;
    private readonly framebuffer: GlFramebuffer;
    private readonly paintQueue: PaintEvent[] = [];
    private readonly paintTools = {
        pen: DEFAULT_PEN satisfies Pen,
        eraser: DEFAULT_ERASER satisfies Eraser,
    }

    constructor(
        private readonly ctx: GlContext,
        private readonly dimensions: { width: number, height: number }
    ) {
        this.framebuffer = ctx.createFramebuffer();
        this.texture = ctx.createTexture();
        this.texture.use(() => {
            this.texture.setParams({
                minFilter: 'linear',
                magFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
            this.texture.ensureSize(this.dimensions.width, this.dimensions.height);
        });
        this.framebuffer.use(() => {
            this.framebuffer.attachTexture(this.texture);
        });
    }

    emit(...event: PaintEvent[]): void {
        this.paintQueue.push(...event);
    }
    
    update(width: number, height: number) {
        if (this.paintQueue.length === 0) return;
        const queue: PaintEvent[] = [];
        const { side, paintSignal, paintEvents } = getGame();
        const context = getContext();
        let clear = false;
        const { pen: newPen, eraser: newEraser } = context.config.photo_mode;
        if (newPen.width !== this.paintTools.pen.width || newPen.opacity !== this.paintTools.pen.opacity || !Vec4.from(newPen.color).equal(this.paintTools.pen.color)) {
            this.paintTools.pen = copy(newPen);
            this.paintQueue.push({
                t: 'cp',
                pen: newPen,
            });
        }
        if (newEraser.width !== this.paintTools.eraser.width || newEraser.opacity !== this.paintTools.eraser.opacity) {
            this.paintTools.eraser = copy(newEraser);
            this.paintQueue.push({
                t: 'ce',
                eraser: newEraser,
            });
        }
        let last: PaintEvent | null = null;
        for (const event of this.paintQueue) {
            if (last && last.t === PAINT_EVENT_TYPE.CHANGE_PEN && event.t === PAINT_EVENT_TYPE.CHANGE_PEN) {
                queue.pop();
                queue.push({
                    t: PAINT_EVENT_TYPE.CHANGE_PEN,
                    pen: event.pen,
                });
            } else if (last && last.t === PAINT_EVENT_TYPE.CHANGE_ERASER && event.t === PAINT_EVENT_TYPE.CHANGE_ERASER) {
                queue.pop();
                queue.push({
                    t: PAINT_EVENT_TYPE.CHANGE_ERASER,
                    eraser: event.eraser,
                });
            } else if (event.t === PAINT_EVENT_TYPE.CLEAR) {
                clear = true;
                queue.length = 0;
                queue.push(event);
                queue.push({
                    t: PAINT_EVENT_TYPE.CHANGE_PEN,
                    pen: this.paintTools.pen,
                });
                queue.push({
                    t: PAINT_EVENT_TYPE.CHANGE_ERASER,
                    eraser: this.paintTools.eraser,
                });
            } else if (event.t === PAINT_EVENT_TYPE.PEN || event.t === PAINT_EVENT_TYPE.ERASER) {
                queue.push(event);
            }
            last = event;
        }
        if (side === 'client') {
            paintEvents.update((buffer) => {
                if (clear) {
                    buffer = PaintBuffer.EMPTY;
                }
                return buffer.push(...queue);
            });
            paintSignal.notify(queue);
        }
        const { gl } = this.ctx;
        matrices.scope(() => {
            matrices.view.identity();
            matrices.projection.identity();
            matrices.projection.orthographic(0, width, height, 0, -1, 1);
            this.framebuffer.use(() => {
                this.ctx.stateManager.pushViewport({ x: width, y: height });
                for (const event of queue) {
                    if (event.t === PAINT_EVENT_TYPE.CHANGE_PEN) {
                        this.paintTools.pen = event.pen;
                    } else if (event.t === PAINT_EVENT_TYPE.CHANGE_ERASER) {
                        this.paintTools.eraser = event.eraser;
                    } else if (event.t === PAINT_EVENT_TYPE.PEN) {
                        const { path } = event;
                        const pen = this.paintTools.pen;
                        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
                        draw.bezierCurve(
                            path.a,
                            path.b,
                            path.c,
                            Vec4.from(pen.color).scale(1 / 255),
                            path.in,
                            path.out,
                        );
                    } else if (event.t === PAINT_EVENT_TYPE.ERASER) {
                        const { path } = event;
                        gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
                        draw.bezierCurve(
                            path.a,
                            path.b,
                            path.c,
                            new Vec4(0, 0, 0, 1),
                            path.in,
                            path.out,
                        );
                        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
                    } else if (event.t === PAINT_EVENT_TYPE.CLEAR) {
                        gl.clear(gl.COLOR_BUFFER_BIT);
                    }
                }
                this.paintQueue.length = 0;
            });
        });
        this.ctx.stateManager.popViewport();
    }
}
