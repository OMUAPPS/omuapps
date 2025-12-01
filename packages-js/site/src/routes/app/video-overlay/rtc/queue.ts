export class AsyncQueue<T> {
    private queue: T[] = [];
    private resolve: ((value: T | null) => void) | null = null;
    private closed = false;

    push(item: T): void {
        if (this.resolve) {
            this.resolve(item);
            this.resolve = null;
        } else {
            this.queue.push(item);
        }
    }

    close() {
        this.closed = true;
        if (this.resolve) {
            this.resolve(null);
            this.resolve = null;
        }
    }

    async pop(): Promise<T | null> {
        if (this.closed) {
            return null;
        }
        if (this.queue.length > 0) {
            return this.queue.shift()!;
        }
        return new Promise<T | null>((resolve) => {
            this.resolve = resolve;
        });
    }
}
