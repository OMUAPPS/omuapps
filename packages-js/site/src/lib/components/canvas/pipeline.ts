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
        type: 'wheel';
        wheel: WheelEvent;
    } | {
        type: 'keyboard';
        keyboard: KeyboardEvent;
    })[] = [];

    private prev: Vec2 = Vec2.ZERO;
    public mouse: Mouse = { pos: Vec2.ZERO, delta: Vec2.ZERO, entered: false };

    constructor(element: HTMLElement) {
        window.addEventListener('mousemove', (event) => this.queue.push({ type: 'mouse', mouse: event }));
        window.addEventListener('mousedown', (event) => this.queue.push({ type: 'mouse', mouse: event }));
        window.addEventListener('mouseup', (event) => this.queue.push({ type: 'mouse', mouse: event }));
        window.addEventListener('mouseenter', (event) => this.queue.push({ type: 'mouse', mouse: event }));
        window.addEventListener('mouseleave', (event) => this.queue.push({ type: 'mouse', mouse: event }));
        window.addEventListener('wheel', (event) => this.queue.push({ type: 'wheel', wheel: event }));
        window.addEventListener('keydown', (event) => this.queue.push({ type: 'keyboard', keyboard: event }));
        window.addEventListener('keyup', (event) => this.queue.push({ type: 'keyboard', keyboard: event }));
    }

    *[Symbol.iterator](): Generator<InputEvent> {
        while (this.queue.length > 0) {
            const event = this.queue.shift();
            if (!event) break;
            if (event.type === 'mouse') {
                const pos = new Vec2(event.mouse.clientX, event.mouse.clientY);
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
            } else if (event.type == 'wheel') {
                yield {
                    kind: 'mouse-wheel',
                    mouse: this.mouse,
                    delta: event.wheel.deltaY,
                };
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

export interface EventKey {
    key: string;
}

export interface EventKeyUp extends EventKey {
    kind: 'key-up';
};

export interface EventKeyDown extends EventKey {
    kind: 'key-down';
}

export interface EventMouse {
    mouse: Mouse;
}

export interface EventMouseWheel extends EventMouse {
    kind: 'mouse-wheel';
    delta: number;
}

export interface EventMouseMove extends EventMouse {
    kind: 'mouse-move';
}

export interface EventMouseButton extends EventMouse {
    button: number;
}
export interface EventMouseDown extends EventMouseButton {
    kind: 'mouse-down';
    button: number;
}
export interface EventMouseUp extends EventMouseButton {
    kind: 'mouse-up';
    button: number;
}

export interface EventMouseEnter extends EventMouse {
    kind: 'mouse-enter';

}

export interface EventMouseLeave extends EventMouse {
    kind: 'mouse-leave';
}

export type InputEvent = EventKeyUp | EventKeyDown | EventMouseWheel | EventMouseMove | EventMouseDown | EventMouseUp | EventMouseEnter | EventMouseLeave;

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
