export interface Event<T> {
    data: T;
    cancel(): void;
}

type EventHandler<T> = (event: Event<T>) => Promise<void>;

interface Entry<T> {
    priority: number;
    handler: EventHandler<T>;
}

export class EventEmitter<T> {
    private listeners: Entry<T>[] = [];

    public subscribe(listener: EventHandler<T>, priority?: number): void {
        this.listeners.push({ priority: priority ?? 0, handler: listener });
        this.listeners.sort((a, b) => b.priority - a.priority);
    }

    public unsubscribe(listener: EventHandler<T>): void {
        this.listeners = this.listeners.filter((entry) => entry.handler !== listener);
    }

    public async emit(data: T): Promise<void> {
        let cancelled = false;
        const event: Event<T> = {
            data,
            cancel: () => { cancelled = true; },
        };
        for (const listener of this.listeners) {
            await listener.handler(event);
            if (cancelled) break;
        }
    }
}
