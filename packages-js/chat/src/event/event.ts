import type { Table, TableEvents } from '@omujs/omu/api/table';
import type { Unlisten } from '@omujs/omu/event';
import { EventEmitter } from '@omujs/omu/event';

import type { Chat } from '../chat.js';

export type EventHandler<P extends Array<any>> = (...args: P) => Promise<void> | void;

export interface EventSource<P extends Array<any>> {
    subscribe(handler: EventHandler<P>, chat: Chat): Unlisten;
}

export class ListenerEvent<P extends Array<any>> implements EventSource<P> {
    constructor(private readonly getListener: (chat: Chat) => EventEmitter<P>) {}

    public subscribe(handler: EventHandler<P>, chat: Chat): Unlisten {
        const listener = this.getListener(chat);
        return listener.listen(handler);
    }
}

class TableListenerEvent<T, K extends keyof TableEvents<T>> implements EventSource<TableEvents<T>[K]> {
    constructor(
        protected readonly getTable: (chat: Chat) => Table<T>,
        private readonly event: K,
    ) {}

    public subscribe(handler: EventHandler<TableEvents<T>[K]>, chat: Chat): Unlisten {
        const table = this.getTable(chat);
        const unlisten = table.on(this.event, handler);
        table.listen();
        return unlisten;
    }
}

export class TableEvent<T> extends TableListenerEvent<T, 'cache'> {
    public readonly AddBatch: EventSource<[Map<string, T>]>;
    public readonly UpdateBatch: EventSource<[Map<string, T>]>;
    public readonly RemoveBatch: EventSource<[Map<string, T>]>;
    public readonly Add: EventSource<[T]>;
    public readonly Update: EventSource<[T]>;
    public readonly Remove: EventSource<[T]>;
    public readonly Clear: EventSource<[]>;
    public readonly wrappers: Record<string, Unlisten>;

    constructor(getTable: (chat: Chat) => Table<T>) {
        super(getTable, 'cache');
        this.AddBatch = new TableListenerEvent(getTable, 'add');
        this.UpdateBatch = new TableListenerEvent(getTable, 'update');
        this.RemoveBatch = new TableListenerEvent(getTable, 'remove');
        this.Add = this.createBatchSubscriber('add');
        this.Update = this.createBatchSubscriber('update');
        this.Remove = this.createBatchSubscriber('remove');
        this.Clear = new TableListenerEvent(getTable, 'clear');
        this.wrappers = {};
    }

    private static createBatchWrapper<T>(emit: EventHandler<[T]>): EventHandler<[Map<string, T>]> {
        return async (items) => {
            for (const item of items.values()) {
                await emit(item);
            }
        };
    }

    private createBatchSubscriber(
        event: 'add' | 'update' | 'remove',
    ): EventSource<[T]> {
        const subscribe = (emit: EventHandler<[T]>, chat: Chat): Unlisten => {
            const table = this.getTable(chat);
            const batchWrapper = TableEvent.createBatchWrapper<T>((item) => emit(item));
            const unlistenEvent = table.on(event, batchWrapper);
            table.listen();
            return unlistenEvent;
        };

        return {
            subscribe,
        };
    }
}

type Entry<P extends Array<any>> = {
    source: EventSource<P>;
    listeners: EventEmitter<P>;
};

export class EventRegistry {
    private readonly chat: Chat;
    private readonly events: Map<EventSource<any>, Entry<any>>;

    constructor(chat: Chat) {
        this.chat = chat;
        this.events = new Map();
    }

    public register<P extends Array<any>>(event: EventSource<P>, handler: EventHandler<P>): Unlisten {
        let entry = this.events.get(event) as Entry<P> | null;
        if (!entry) {
            const newEntry: Entry<P> = {
                source: event,
                listeners: new EventEmitter(),
            };
            entry = newEntry;
            this.events.set(event, newEntry);
            event.subscribe((...args) => newEntry.listeners.emit(...args), this.chat);
        }
        return entry.listeners.listen(handler);
    }
}
