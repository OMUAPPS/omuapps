import { describe, expect, test } from 'bun:test';
import { EventHub } from '../src/event';

interface TestEvents {
    message: [string];
}

describe('EventHub', () => {
    test('off removes the registered listener', async () => {
        const events = new EventHub<TestEvents>();
        const received: string[] = [];
        const listener = (message: string) => received.push(message);

        events.on('message', listener);
        events.off('message', listener);
        await events.emit('message', 'hello');

        expect(received).toEqual([]);
    });

    test('unlisten is idempotent', async () => {
        const events = new EventHub<TestEvents>();
        const received: string[] = [];
        const unlisten = events.on('message', () => received.push('first'));
        events.on('message', () => received.push('second'));

        unlisten();
        unlisten();
        await events.emit('message', 'hello');

        expect(received).toEqual(['second']);
    });
});
