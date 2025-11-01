export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

export function lerp01(a: number, b: number, t: number): number {
    return a + (b - a) * clamp(t, 0, 1);
}

export function invLerp(a: number, b: number, x: number): number {
    return (x - a) / (b - a);
}

export function clamp(x: number, min: number, max: number): number {
    return Math.max(min, Math.min(x, max));
}

export function roundTo(x: number, n: number): number {
    return Math.round(x / n) * n;
}
