export class BetterMath {
    public static TAU = Math.PI * 2;

    public static toRadians(degrees: number): number {
        return degrees * Math.PI / 180;
    }

    public static toDegrees(radians: number): number {
        return radians * 180 / Math.PI;
    }

    public static lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    public static inverseLerp(a: number, b: number, value: number): number {
        // (b - a): distance between origin and target
        // (value - a): distance between origin and value
        return (value - a) / (b - a);
    }

    public static remap(value: number, a: number, b: number, c: number, d: number): number {
        const t = BetterMath.inverseLerp(a, b, value);
        return BetterMath.lerp(c, d, t);
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
        if (x > 0.5) {
            return 1.5 - x;
        } else {
            return 0.5 - x;
        }
    }

    public static wrapDegrees(degrees: number): number {
        // wrap degrees to -180 to 180
        degrees = degrees % 360;
        if (degrees > 180) {
            degrees -= 360;
        }
        if (degrees < -180) {
            degrees += 360;
        }
        return degrees;
    }


    public static angleDifference(a: number, b: number): number {
        const difference = (b - a) % this.TAU;
        return (2 * difference) % this.TAU - difference;
    }

    public static lerpAngle(a: number, b: number, t: number): number {
        return a + BetterMath.angleDifference(a, b) * t;
    }

    public static clampDegrees(value: number, min: number, max: number): number {
        // wrap value to -180 to 180
        value = BetterMath.wrapDegrees(value);

        // wrap min and max to -180 to 180
        min = BetterMath.wrapDegrees(min);
        max = BetterMath.wrapDegrees(max);

        // interpolate the wrapped values
        return BetterMath.wrapDegrees(BetterMath.clamp(value, min, max));
    }
}
