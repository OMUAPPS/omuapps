export type Unlisten = () => void;

export class EventEmitter<P extends Array<any>> {
    private readonly listeners: Array<(...args: P) => Promise<void> | void> = [];

    public listen(listener: (...args: P) => any): Unlisten {
        this.listeners.push(listener);
        return () => {
            this.listeners.splice(this.listeners.indexOf(listener), 1);
        };
    }

    public async emit(...args: P): Promise<void> {
        for (const listener of [...this.listeners]) {
            await listener(...args);
        }
    }
}
