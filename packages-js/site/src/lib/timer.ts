export class Timer {
    private lastMS: number;

    public static now(): number {
        return performance.now();
    }

    public constructor() {
        this.lastMS = Timer.now();
    }

    public getElapsedMS(): number {
        const now = Timer.now();
        const elapsed = now - this.lastMS;
        return elapsed;
    }

    public delay(ms: number): boolean {
        return this.getElapsedMS() >= ms;
    }

    public tick(ms: number): number {
        const elapsed = this.getElapsedMS();
        const tick = Math.floor(elapsed / ms);
        this.lastMS += tick * ms;
        return tick;
    }

    public reset(): void {
        this.lastMS = Timer.now();
    }
}
