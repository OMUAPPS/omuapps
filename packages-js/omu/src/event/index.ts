export type Unlisten = () => void;

export class EventEmitter<P extends Array<any>> {
    private readonly listeners: Array<(...args: P) => Promise<void> | void> = [];

    public listen(listener: (...args: P) => any): Unlisten {
        this.listeners.push(listener);
        return () => this.off(listener);
    }

    public off(listener: (...args: P) => Promise<void> | void): void {
        const index = this.listeners.indexOf(listener);
        if (index !== -1) {
            this.listeners.splice(index, 1);
        }
    }

    public async emit(...args: P): Promise<void> {
        for (const listener of [...this.listeners]) {
            await listener(...args);
        }
    }
}

export class EventHub<Events extends Record<string, Array<any>>> {
    private readonly listeners: Map<keyof Events, EventEmitter<any>> = new Map();

    public on<K extends keyof Events>(event: K, listener: (...args: Events[K]) => Promise<void> | void): Unlisten {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new EventEmitter());
        }
        const emitter = this.listeners.get(event) as EventEmitter<Events[K]>;
        return emitter.listen(listener);
    }

    public off<K extends keyof Events>(event: K, listener: (...args: Events[K]) => Promise<void> | void): void {
        const emitter = this.listeners.get(event);
        if (emitter) {
            emitter.off(listener);
        }
    }

    public async emit<K extends keyof Events>(event: K, ...args: Events[K]): Promise<void> {
        const emitter = this.listeners.get(event);
        if (emitter) {
            await emitter.emit(...args);
        }
    }
}
