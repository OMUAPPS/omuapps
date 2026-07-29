import { describe, expect, mock, test } from 'bun:test';
import type { Table } from '@omujs/omu/api/table';
import { EventHub } from '@omujs/omu/event';

import type { Chat } from '../src/chat';
import { EventRegistry, type EventSource, TableEvent } from '../src/event/event';

function createTable<T>(): Table<T> {
    const events = new EventHub<{
        add: [Map<string, T>];
        update: [Map<string, T>];
        remove: [Map<string, T>];
        clear: [];
        cache: [Map<string, T>];
    }>();
    return {
        listen: mock(() => () => {}),
        on: (event, listener) => events.on(event, listener),
        off: (event, listener) => events.off(event, listener),
    } as unknown as Table<T>;
}

describe('TableEvent', () => {
    test('all event types start listening to the table', () => {
        const table = createTable<string>();
        const events = new TableEvent(() => table);
        const chat = {} as Chat;
        const sources: EventSource<any>[] = [
            events,
            events.Add,
            events.Update,
            events.Remove,
            events.AddBatch,
            events.UpdateBatch,
            events.RemoveBatch,
            events.Clear,
        ];

        for (const source of sources) {
            source.subscribe(() => {}, chat);
        }

        expect(table.listen).toHaveBeenCalledTimes(sources.length);
    });
});

describe('EventRegistry', () => {
    test('register returns a function that removes only that handler', async () => {
        let emit: ((message: string) => Promise<void> | void) | undefined;
        const subscribe = mock((handler: (message: string) => Promise<void> | void) => {
            emit = handler;
            return () => {};
        });
        const source: EventSource<[string]> = { subscribe };
        const registry = new EventRegistry({} as Chat);
        const received: string[] = [];

        const unlistenFirst = registry.register(source, () => received.push('first'));
        registry.register(source, () => received.push('second'));

        await emit?.('before');
        unlistenFirst();
        await emit?.('after');

        expect(subscribe).toHaveBeenCalledTimes(1);
        expect(received).toEqual(['first', 'second', 'second']);
    });
});
