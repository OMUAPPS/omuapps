import { Vec2 } from '$lib/math/vec2';
import { Draw } from './draw';
import { GlContext } from './glcontext';
import { Matrices } from './matrices';

export interface Mouse {
    pos: Vec2;
    delta: Vec2;
    entered: boolean;
}

export interface Input {
    mouse: Mouse;
    [Symbol.iterator](): Generator<InputEvent>;
}

export class HTMLInput implements Input {
    private queue: ({
        type: 'mouse';
        mouse: MouseEvent;
    } | {
        type: 'keyboard';
        keyboard: KeyboardEvent;
    })[] = [];

    private prev: Vec2 = Vec2.ZERO;
    public mouse: Mouse = { pos: Vec2.ZERO, delta: Vec2.ZERO, entered: false };

    constructor(element: HTMLElement) {
        element.addEventListener('mousemove', (event) => this.queue.push({ type: 'mouse', mouse: event }));
        element.addEventListener('mousedown', (event) => this.queue.push({ type: 'mouse', mouse: event }));
        element.addEventListener('mouseup', (event) => this.queue.push({ type: 'mouse', mouse: event }));
        element.addEventListener('mouseenter', (event) => this.queue.push({ type: 'mouse', mouse: event }));
        element.addEventListener('mouseleave', (event) => this.queue.push({ type: 'mouse', mouse: event }));
        element.addEventListener('keydown', (event) => this.queue.push({ type: 'keyboard', keyboard: event }));
        element.addEventListener('keyup', (event) => this.queue.push({ type: 'keyboard', keyboard: event }));
    }

    *[Symbol.iterator](): Generator<InputEvent> {
        while (this.queue.length > 0) {
            const event = this.queue.shift();
            if (!event) break;
            if (event.type === 'mouse') {
                const pos = new Vec2(event.mouse.offsetX, event.mouse.offsetY);
                const delta = pos.sub(this.prev);
                this.prev = pos;

                this.mouse = {
                    pos,
                    delta,
                    entered: true,
                };

                if (event.mouse.type === 'mousemove') {
                    yield {
                        kind: 'mouse-move',
                        mouse: this.mouse,
                    };
                } else if (event.mouse.type === 'mousedown') {
                    yield {
                        kind: 'mouse-down',
                        mouse: this.mouse,
                        button: event.mouse.button,
                    };
                } else if (event.mouse.type === 'mouseup') {
                    yield {
                        kind: 'mouse-up',
                        mouse: this.mouse,
                        button: event.mouse.button,
                    };
                } else if (event.mouse.type === 'mouseenter') {
                    yield {
                        kind: 'mouse-enter',
                        mouse: this.mouse,
                    };
                } else if (event.mouse.type === 'mouseleave') {
                    this.mouse.entered = false;
                    yield {
                        kind: 'mouse-leave',
                        mouse: this.mouse,
                    };
                }
            } else if (event.type == 'keyboard') {
                if (event.keyboard.type === 'keydown') {
                    yield {
                        kind: 'key-down',
                        key: event.keyboard.key,
                    };
                } else if (event.keyboard.type === 'keyup') {
                    yield {
                        kind: 'key-down',
                        key: event.keyboard.key,
                    };
                }
            }
        }
        this.queue.length = 0;
    }
}

export type InputEvent = {
    kind: 'mouse-move';
    mouse: Mouse;
} | {
    kind: 'mouse-down';
    button: number;
    mouse: Mouse;
} | {
    kind: 'mouse-up';
    button: number;
    mouse: Mouse;
} | {
    kind: 'mouse-enter';
    mouse: Mouse;
} | {
    kind: 'mouse-leave';
    mouse: Mouse;
} | {
    kind: 'key-down';
    key: string;
} | {
    kind: 'key-up';
    key: string;
};

export interface Time {
    stamp: number;
    delta: number;
}

export interface Frame {
    time: Time;
}

export interface RenderPipeline {
    context: GlContext;
    matrices: Matrices;
    draw: Draw;
    input: Input;
    time: Time;
    [Symbol.asyncIterator](): AsyncGenerator<Frame>;
}
