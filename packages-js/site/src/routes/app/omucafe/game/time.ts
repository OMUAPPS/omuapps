export class Time {
    public static origin = performance.timeOrigin;

    public static now(): number {
        return performance.now() + Time.origin;
    }
}
