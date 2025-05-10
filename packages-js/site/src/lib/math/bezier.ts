import { AABB2 } from './aabb2.js';
import { Vec2, type PossibleVec2 } from './vec2.js';

export class Bezier {
    public static quadratic(
        a: number,
        b: number,
        c: number,
        t: number
    ): number {
        const t0 = a;
        const t1 = -2 * a + 2 * b;
        const t2 = a - 2 * b + c;
        return t0 + t1 * t + t2 * t * t;
    }

    public static quadratic2(
        a: PossibleVec2,
        b: PossibleVec2,
        c: PossibleVec2,
        t: number
    ): Vec2 {
        return new Vec2(
            this.quadratic(a.x, b.x, c.x, t),
            this.quadratic(a.y, b.y, c.y, t)
        );
    }

    public static quadraticDerivative(
        a: number,
        b: number,
        c: number,
        t: number,
    ): number {
        const t0 = -2.0 * a + 2.0 * b;
        const t1 = 2.0 * (a - 2.0 * b + c);
        return t0 + t1 * t;
    }

    public static quadraticDerivative2(
        a: PossibleVec2,
        b: PossibleVec2,
        c: PossibleVec2,
        t: number,
    ): Vec2 {
        return new Vec2(
            this.quadraticDerivative(a.x, b.x, c.x, t),
            this.quadraticDerivative(a.y, b.y, c.y, t)
        );
    }

    public static quadraticRoots(
        a: number,
        b: number,
        c: number
    ): number {
        return 2 * (a - b) / (2 * (a - 2 * b + c));
    }

    public static quadraticBounds(
        a: number,
        b: number,
        c: number
    ): [number, number] {
        // Minimum Quadratic Bezier curve bounds (https://www.desmos.com/calculator/fypbykkqsi)
        // t=\frac{2a-2b}{2(a-2b+c)}
        const t = this.quadraticRoots(a, b, c);
        if (t < 0 || t > 1) {
            return [Math.min(a, c), Math.max(a, c)];
        }
        const p = this.quadratic(a, b, c, t);
        return [Math.min(a, p, c), Math.max(a, p, c)];
    }

    public static quadraticBounds2(
        a: PossibleVec2,
        b: PossibleVec2,
        c: PossibleVec2
    ): AABB2 {
        const [minX, maxX] = this.quadraticBounds(a.x, b.x, c.x);
        const [minY, maxY] = this.quadraticBounds(a.y, b.y, c.y);
        return new AABB2(
            new Vec2(minX, minY),
            new Vec2(maxX, maxY)
        );
    }
}
