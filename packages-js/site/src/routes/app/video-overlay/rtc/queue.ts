export class AsyncQueue<T> {
    private queue: T[] = [];
    private resolve: ((value: T) => void) | null = null;

    push(item: T): void {
        if (this.resolve) {
            this.resolve(item);
            this.resolve = null;
        } else {
            this.queue.push(item);
        }
    }

    async pop(): Promise<T | null> {
        if (this.queue.length > 0) {
            return this.queue.shift()!;
        }
        return new Promise<T>((resolve) => {
            this.resolve = resolve;
        });
    }
}
