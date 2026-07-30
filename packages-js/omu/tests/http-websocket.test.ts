import { describe, expect, test } from 'bun:test';

import { OmuWS } from '../src/api/http/websocket';

async function nextTask(): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe('OmuWebSocket', () => {
    test('forwards open and close events and updates readyState', async () => {
        const sent: unknown[] = [];
        const closed: Array<{ code?: number; reason?: string }> = [];
        const handle = OmuWS.create({
            addQueue: (data) => sent.push(data),
            dispose: (options) => closed.push(options),
        });
        const socket = handle.ws.toWebSocket();
        const events: string[] = [];

        socket.onopen = () => events.push('open');
        socket.onclose = () => events.push('close');

        handle.open({
            id: 'socket-0',
            url: 'wss://example.com',
            protocol: 'test',
        });
        await nextTask();

        expect(socket.readyState).toBe(socket.OPEN);
        expect(socket.url).toBe('wss://example.com');
        expect(socket.protocol).toBe('test');
        expect(events).toEqual(['open']);

        socket.send('hello');
        expect(sent).toEqual(['hello']);

        socket.close(1000, 'done');
        expect(socket.readyState).toBe(socket.CLOSING);
        expect(closed).toEqual([{ code: 1000, reason: 'done' }]);

        handle.close({
            id: 'socket-0',
            code: 1000,
            reason: 'done',
        });
        await nextTask();

        expect(socket.readyState).toBe(socket.CLOSED);
        expect(events).toEqual(['open', 'close']);
    });
});
