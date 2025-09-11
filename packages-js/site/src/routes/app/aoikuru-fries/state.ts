import { BROWSER } from 'esm-env';
import { writable } from 'svelte/store';

export type ThrowData = {
    thrower: string;
    count: number;
};

export type State = {
    type: 'idle';
    start: number;
} | {
    type: 'catching';
    data: ThrowData;
    start: number;
};

export type StateType = State['type'];

export const frame = writable(0);

if (BROWSER) {
    requestAnimationFrame(function loop() {
        const time = performance.timeOrigin + performance.now();
        frame.set(time);
        requestAnimationFrame(loop);
    });
}
