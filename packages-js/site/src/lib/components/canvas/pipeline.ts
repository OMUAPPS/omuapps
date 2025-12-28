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
        ev: MouseEvent;
    } | {
        type: 'wheel';
        ev: WheelEvent;
    } | {
        type: 'keyboard';
        ev: KeyboardEvent;
    })[] = [];

    private prev: Vec2 = Vec2.ZERO;
    public mouse: Mouse = { pos: Vec2.ZERO, delta: Vec2.ZERO, entered: false };

    constructor(element: HTMLElement) {
        window.addEventListener('mousemove', (ev) => this.queue.push({ type: 'mouse', ev }));
        window.addEventListener('mousedown', (ev) => this.queue.push({ type: 'mouse', ev }));
        window.addEventListener('mouseup', (ev) => this.queue.push({ type: 'mouse', ev }));
        window.addEventListener('mouseenter', (ev) => this.queue.push({ type: 'mouse', ev }));
        window.addEventListener('mouseleave', (ev) => this.queue.push({ type: 'mouse', ev }));
        window.addEventListener('wheel', (ev) => this.queue.push({ type: 'wheel', ev }));
        window.addEventListener('keydown', (ev) => this.queue.push({ type: 'keyboard', ev }));
        window.addEventListener('keyup', (ev) => this.queue.push({ type: 'keyboard', ev }));
    }

    *[Symbol.iterator](): Generator<InputEvent> {
        while (this.queue.length > 0) {
            const event = this.queue.shift();
            if (!event) break;
            if (event.type === 'mouse') {
                const pos = new Vec2(event.ev.clientX, event.ev.clientY);
                const delta = pos.sub(this.prev);
                this.prev = pos;

                this.mouse = {
                    pos,
                    delta,
                    entered: true,
                };

                if (event.ev.type === 'mousemove') {
                    yield {
                        timestamp: event.ev.timeStamp,
                        kind: 'mouse-move',
                        mouse: this.mouse,
                    };
                } else if (event.ev.type === 'mousedown') {
                    yield {
                        timestamp: event.ev.timeStamp,
                        kind: 'mouse-down',
                        mouse: this.mouse,
                        button: event.ev.button,
                    };
                } else if (event.ev.type === 'mouseup') {
                    yield {
                        timestamp: event.ev.timeStamp,
                        kind: 'mouse-up',
                        mouse: this.mouse,
                        button: event.ev.button,
                    };
                } else if (event.ev.type === 'mouseenter') {
                    yield {
                        timestamp: event.ev.timeStamp,
                        kind: 'mouse-enter',
                        mouse: this.mouse,
                    };
                } else if (event.ev.type === 'mouseleave') {
                    this.mouse.entered = false;
                    yield {
                        timestamp: event.ev.timeStamp,
                        kind: 'mouse-leave',
                        mouse: this.mouse,
                    };
                }
            } else if (event.type == 'wheel') {
                yield {
                    timestamp: event.ev.timeStamp,
                    kind: 'mouse-wheel',
                    mouse: this.mouse,
                    delta: event.ev.deltaY,
                };
            } else if (event.type == 'keyboard') {
                if (event.ev.type === 'keydown') {
                    yield {
                        timestamp: event.ev.timeStamp,
                        kind: 'key-down',
                        key: event.ev.key,
                    };
                } else if (event.ev.type === 'keyup') {
                    yield {
                        timestamp: event.ev.timeStamp,
                        kind: 'key-down',
                        key: event.ev.key,
                    };
                }
            }
        }
        this.queue.length = 0;
    }
}

export interface TimedInputEvent {
    timestamp: number;
}

export interface EventKey extends TimedInputEvent {
    key: string;
}

export interface EventKeyUp extends EventKey {
    kind: 'key-up';
};

export interface EventKeyDown extends EventKey {
    kind: 'key-down';
}

export interface EventMouse extends TimedInputEvent {
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
