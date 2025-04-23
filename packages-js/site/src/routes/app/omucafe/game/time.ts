export class Time {
    public static origin = performance.timeOrigin;

    public static get(): number {
        return performance.now() + Time.origin;
    }
}
