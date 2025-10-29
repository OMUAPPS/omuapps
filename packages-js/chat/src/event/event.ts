import type { Table } from '@omujs/omu/api/table';
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

export class TableEvent<T> extends ListenerEvent<[Map<string, T>]> {
    public readonly AddBatch: ListenerEvent<[Map<string, T>]>;
    public readonly UpdateBatch: ListenerEvent<[Map<string, T>]>;
    public readonly RemoveBatch: ListenerEvent<[Map<string, T>]>;
    public readonly Add: EventSource<[T]>;
    public readonly Update: EventSource<[T]>;
    public readonly Remove: EventSource<[T]>;
    public readonly Clear: EventSource<[]>;
    public readonly wrappers: Record<string, Unlisten>;

    constructor(private readonly getTable: (chat: Chat) => Table<T>) {
        super((chat) => getTable(chat).event.cacheUpdate);
        this.AddBatch = new ListenerEvent((chat) => getTable(chat).event.add);
        this.UpdateBatch = new ListenerEvent((chat) => getTable(chat).event.update);
        this.RemoveBatch = new ListenerEvent((chat) => getTable(chat).event.remove);
        this.Add = this.createBatchSubscriber((table) => table.event.add);
        this.Update = this.createBatchSubscriber((table) => table.event.update);
        this.Remove = this.createBatchSubscriber((table) => table.event.remove);
        this.Clear = new ListenerEvent((client) => getTable(client).event.clear);
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
        getListener: (table: Table<T>) => EventEmitter<[Map<string, T>]>,
    ): EventSource<[T]> {
        let batchWrapper: EventHandler<[Map<string, T>]> | null = null;

        const subscribe = (emit: EventHandler<[T]>, chat: Chat): Unlisten => {
            const table = this.getTable(chat);
            const listener = getListener(table);
            batchWrapper = TableEvent.createBatchWrapper((item) => emit(item));
            const stopListen = table.listen();
            const clearEvent = listener.listen(batchWrapper);
            return () => {
                stopListen();
                clearEvent();
            };
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

    public register<P extends Array<any>>(event: EventSource<P>, handler: EventHandler<P>): void {
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
        entry.listeners.listen((...args) => handler(...args));
    }
}
