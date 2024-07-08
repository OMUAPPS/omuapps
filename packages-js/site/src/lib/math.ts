export class BetterMath {
    public static lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    public static clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }

    public static clamp01(value: number): number {
        return BetterMath.clamp(value, 0, 1);
    }

    public static smoothstep(edge0: number, edge1: number, x: number): number {
        const t = BetterMath.clamp((x - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
    }

    public static random(): number {
        const x = Math.random() * 1000000;
        return x - Math.floor(x);
    }

    public static invjsrandom(): number {
        const x = Math.random();
        if (x < 0.5) {
            return 0.5 - x;
        } else {
            return x - 0.5;
        }
    }
}
