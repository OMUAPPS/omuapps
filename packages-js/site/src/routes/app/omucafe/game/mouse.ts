import { Vec2 } from '$lib/math/vec2.js';
import { BROWSER } from 'esm-env';
import { Time } from './time.js';

type MouseEvent = {
    type: 'move',
    pos: Vec2,
    timestamp: number,
} | {
    type: 'down',
    timestamp: number,
} | {
    type: 'up',
    timestamp: number,
} | {
    type: 'enter',
    pos: Vec2,
    timestamp: number,
} | {
    type: 'leave',
    pos: Vec2,
    timestamp: number,
}

export class Mouse {
    private constructor(
        private readonly events: MouseEvent[] = [],
        public over = false,
        public ui = false,
        public client = Vec2.ZERO,
        public position = Vec2.ZERO,
        public delta = Vec2.ZERO,
        public gl = Vec2.ZERO,
        public deltaGl = Vec2.ZERO,
        public down = false,
        public downTime = 0,
        public upTime = 0,
    ) { }

    private handle(event: MouseEvent) {
        switch (event.type) {
            case 'move': {
                this.client = event.pos;
                this.over = true;
                break;
            }
            case 'down': {
                this.down = true;
                this.downTime = event.timestamp;
                break;
            }
            case 'up': {
                this.down = false;
                this.upTime = event.timestamp;
                break;
            }
            case 'enter': {
                this.over = true;
                break;
            }
            case 'leave': {
                this.over = false;
                break;
            }
        }
    }

    public *iterate() {
        for (const event of this.events) {
            this.handle(event);
            yield event;
        }
        this.events.length = 0;
    }

    public static create() {
        if (!BROWSER) return new Mouse([]);
        const events: MouseEvent[] = [];
        window.addEventListener('mousemove', async ({ clientX: x, clientY: y, timeStamp }) => {
            events.push({
                type: 'move',
                pos: new Vec2(x, y),
                timestamp: Time.origin + timeStamp,
            });
        });
        window.addEventListener('mousedown', async ({ timeStamp }) => {
            events.push({
                type: 'down',
                timestamp: Time.origin + timeStamp,
            });
        });
        window.addEventListener('mouseup', async ({ timeStamp }) => {
            events.push({
                type: 'up',
                timestamp: Time.origin + timeStamp,
            });
        });
        window.addEventListener('touchstart', async (e) => {
            events.push({
                type: 'down',
                timestamp: Time.origin + e.timeStamp,
            });
        });
        window.addEventListener('touchend', async (e) => {
            events.push({
                type: 'up',
                timestamp: Time.origin + e.timeStamp,
            });
        });
        window.addEventListener('touchmove', async (e) => {
            const [touch] = e.touches;
            events.push({
                type: 'move',
                pos: new Vec2(touch.clientX, touch.clientY),
                timestamp: Time.origin + e.timeStamp,
            });
        });
        window.addEventListener('mouseout', async ({ clientX: x, clientY: y, timeStamp }) => {
            events.push({
                type: 'leave',
                pos: new Vec2(x, y),
                timestamp: Time.origin + timeStamp,
            });
        });
        window.addEventListener('mouseleave', async ({ clientX: x, clientY: y, timeStamp }) => {
            events.push({
                type: 'leave',
                pos: new Vec2(x, y),
                timestamp: Time.origin + timeStamp,
            });
        });
        window.addEventListener('mouseenter', async ({ clientX: x, clientY: y, timeStamp }) => {
            events.push({
                type: 'enter',
                pos: new Vec2(x, y),
                timestamp: Time.origin + timeStamp,
            });
        });
        return new Mouse(
            events,
        );
    }
}
