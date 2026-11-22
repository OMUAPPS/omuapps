export class Throttle {
    private last = 0;
    private queue: Promise<void> = Promise.resolve();

    public constructor(private readonly intervalMs: number) {}

    public wait(): Promise<void> {
        const turn = this.queue.then(async () => {
            const remaining = this.last + this.intervalMs - Date.now();
            if (remaining > 0) await Bun.sleep(remaining);
            this.last = Date.now();
        });
        this.queue = turn;
        return turn;
    }
}
