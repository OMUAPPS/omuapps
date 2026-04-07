import type { GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext';
import { lerp } from '$lib/math/math';
import { Vec2 } from '$lib/math/vec2';
import { Vec4 } from '$lib/math/vec4';
import { PALETTE_RGB } from '../colors';
import type { Game } from '../core/game';
import type { BrushCommand, CanvasCommand } from '../core/game-state';

export class Palette {}

export interface CanvasOptions {
    pos: Vec2;
    mouse: Vec2;
    size: Vec2;
}

const CONFIG = {
    WIDTH: 830,
    HEIGHT: 1080,
    CHUNK_SIZE_LIMIT: 100,
    DUMPING_FACTOR: 0.4,
    WIDTH_DUMPING_FACTOR: 0.6,
} as const;

type StrokeState =
    | { kind: 'start'; pos: Vec2 }
    | { kind: 'move'; pos: Vec2; extended: Vec2 }
    | { kind: 'idle' };

interface BrushState {
    type: 'brush' | 'eraser';
    stroke: StrokeState;
    currentWidth: number;
    width: number;
    color: Vec4;
}

export class Canvas {
    private readonly buffer: GlFramebuffer;
    private readonly texture: GlTexture;
    private toPaintCommands: CanvasCommand[] = [];

    private brush: BrushState = {
        type: 'brush',
        stroke: { kind: 'idle' },
        currentWidth: 20,
        width: 20,
        color: Vec4.ONE,
    };

    constructor(private readonly game: Game) {
        const { context } = game.pipeline;
        this.buffer = context.createFramebuffer();
        this.texture = context.createTexture();

        this.texture.use(() => {
            this.texture.setImage(null, {
                width: CONFIG.WIDTH,
                height: CONFIG.HEIGHT,
                internalFormat: 'rgba',
                format: 'rgba',
            });
            this.texture.setParams({
                magFilter: 'linear',
                minFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
        });

        this.buffer.use(() => {
            this.buffer.attachTexture(this.texture);
        });

        this.loadHeap();
    }

    private loadHeap() {
        const stack = this.game.states.canvasEditStack.value;
        const heap = this.game.states.canvasEditHeap;
        const signal = this.game.states.canvasEditSignal;

        const chunks = Array.from(heap.values()).sort((a, b) => a.i - b.i);

        for (const chunk of chunks) {
            this.toPaintCommands.push(...chunk.c);
        }
        this.toPaintCommands.push(...stack.c);
        if (this.game.side !== 'client') {
            signal.listen((chunk) => {
                this.toPaintCommands.push(...chunk.c);
            });
        }
    }

    public async render(options: CanvasOptions): Promise<GlTexture> {
        const { matrices, context } = this.game.pipeline;

        matrices.push();
        matrices.identity();
        matrices.projection.orthographic(0, CONFIG.HEIGHT, CONFIG.WIDTH, 0, -1, 1);
        context.stateManager.pushViewport({ x: CONFIG.WIDTH, y: CONFIG.HEIGHT });

        await this.buffer.useAsync(async () => {
            this.dispatchPaintCommands();
        });

        context.stateManager.popViewport();
        matrices.pop();

        return this.texture;
    }

    public renderCursor(options: CanvasOptions) {
        const { draw } = this.game.pipeline;
        const { canvas } = this.game.states.config.value;
        const toolType = canvas.tool?.type;
        const renderMouse = options.mouse.toArray();
        if (toolType === 'move') return;

        const width = this.brush.stroke.kind === 'idle' ? this.brush.width : this.brush.currentWidth;

        draw.circle(...renderMouse, width - 2, width + 4, PALETTE_RGB.CANVAS_BRUSH_OUTLINE_2);
        draw.circle(...renderMouse, width, width + 2, PALETTE_RGB.CANVAS_BRUSH_OUTLINE_1);
    }

    public updateInput(options: CanvasOptions) {
        const { input } = this.game.pipeline;
        const { canvas } = this.game.states.config.value;
        const commandStack: CanvasCommand[] = [];

        const isMouseDown = input.mouse.buttons[0];
        const isShiftDown = input.keyboard.keys['Shift'];
        const toolType = canvas.tool?.type;
        if (toolType === 'move') return;

        if (isMouseDown && isShiftDown && toolType) {
            const delta = (input.mouse.delta.x + input.mouse.delta.y) * 2;
            if (toolType === 'brush') canvas.brush.width += delta;
            else if (toolType === 'eraser') canvas.eraser.width += delta;
        }

        if (isMouseDown) {
            if (!isShiftDown && this.brush.stroke.kind === 'idle') {
                commandStack.push({ t: 'bs', p: options.pos.toArray() });
            } else if (this.brush.stroke.kind !== 'idle') {
                commandStack.push({ t: 'bm', p: options.pos.toArray() });
            }
        } else if (this.brush.stroke.kind !== 'idle') {
            commandStack.push({ t: 'be', p: options.pos.toArray() });
        }

        if (toolType === 'brush') {
            if (this.brush.type !== 'brush') {
                commandStack.push({ t: 'st', k: 'brush' });
            }
            if (!this.brush.color.equal(canvas.brush.color)) {
                const { x, y, z, w } = canvas.brush.color;
                commandStack.push({ t: 'sc', c: [x, y, z, w] });
            }
            if (this.brush.width !== canvas.brush.width) {
                commandStack.push({ t: 'sw', w: canvas.brush.width });
            }
        } else if (toolType === 'eraser') {
            if (this.brush.type !== 'eraser') {
                commandStack.push({ t: 'st', k: 'eraser' });
            }
            if (this.brush.width !== canvas.eraser.width) {
                commandStack.push({ t: 'sw', w: canvas.eraser.width });
            }
        }

        const stack = this.game.states.canvasEditStack.value;
        const signal = this.game.states.canvasEditSignal;
        signal.notify({
            i: stack.i,
            c: commandStack,
        });

        if (commandStack.length > 0) {
            this.toPaintCommands.push(...commandStack);
            this.saveCommandsToHistory(commandStack, isMouseDown);
        }
    }

    private saveCommandsToHistory(commands: CanvasCommand[], isMouseDown: boolean) {
        const stack = this.game.states.canvasEditStack.value;
        const heap = this.game.states.canvasEditHeap;

        stack.c.push(...commands);

        if (stack.c.length > CONFIG.CHUNK_SIZE_LIMIT && !isMouseDown) {
            heap.set(stack.i.toString(), {
                i: stack.i,
                c: [...stack.c],
            });
            stack.i++;
            stack.c = [];
        }
    }

    private dispatchPaintCommands() {
        if (this.toPaintCommands.length === 0) return;

        for (const command of this.toPaintCommands) {
            switch (command.t) {
                case 'sc':
                    this.brush.color = new Vec4(...command.c);
                    break;
                case 'sw':
                    this.brush.width = command.w;
                    break;
                case 'st':
                    this.brush.type = command.k as 'brush' | 'eraser';
                    break;
                default:
                    this.processBrushCommand(command);
                    break;
            }
        }

        this.toPaintCommands.length = 0;

        const { gl } = this.game.pipeline.context;
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }

    private processBrushCommand(command: BrushCommand) {
        const { context, draw } = this.game.pipeline;
        const { gl } = context;

        if (this.brush.type === 'eraser') {
            gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
        } else {
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        }

        if (command.t === 'bs') {
            this.brush.stroke = {
                kind: 'start',
                pos: new Vec2(...command.p),
            };
            this.brush.currentWidth = 0;
            return;
        }

        if (this.brush.stroke.kind === 'idle') return;

        const isMove = command.t === 'bm';
        const from = this.brush.stroke.pos;
        const to = new Vec2(command.p[0], command.p[1]);

        let midpoint: Vec2;
        let extendedPos: Vec2 | undefined;
        let nextWidth: number;
        const prevWidth = this.brush.currentWidth;

        if (this.brush.stroke.kind === 'start') {
            midpoint = from.lerp(to, 0.5).add(Vec2.CENTER);
            if (isMove) {
                extendedPos = from.lerp(to, 1 + CONFIG.DUMPING_FACTOR).add(Vec2.CENTER);
            }
            nextWidth = lerp(prevWidth, this.brush.width, CONFIG.WIDTH_DUMPING_FACTOR);
        } else {
            midpoint = this.brush.stroke.extended;
            if (isMove) {
                extendedPos = midpoint.lerp(to, 1 + CONFIG.DUMPING_FACTOR);
            }
            nextWidth = isMove ? lerp(prevWidth, this.brush.width, CONFIG.WIDTH_DUMPING_FACTOR) : 0;
        }

        this.brush.currentWidth = nextWidth;
        draw.bezierCurve(from, midpoint, to, this.brush.color, prevWidth, nextWidth);

        if (isMove && extendedPos) {
            this.brush.stroke = { kind: 'move', pos: to, extended: extendedPos };
        } else {
            this.brush.stroke = { kind: 'idle' };
        }
    }

    public clear() {
        this.buffer.use(() => {
            const { gl } = this.game.pipeline.context;
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        });
        this.toPaintCommands = [];
        const { canvas } = this.game.states.config.value;
        canvas.tool = { type: 'move' };
        this.game.states.canvasEditStack.value.c = [
            { t: 'sc', c: [canvas.brush.color.x, canvas.brush.color.y, canvas.brush.color.z, canvas.brush.color.w] },
            { t: 'sw', w: canvas.brush.width },
            { t: 'st', k: 'brush' },
        ];
        this.game.states.canvasEditHeap.clear();
    }
}
