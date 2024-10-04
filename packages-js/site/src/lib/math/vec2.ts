import { lerp } from './math.js';

export class Vec2 {
    public static ZERO = new Vec2(0, 0);

    constructor(
        public readonly x: number,
        public readonly y: number,
    ) {}

    lerp(other: Vec2, t: number): Vec2 {
        return new Vec2(lerp(this.x, other.x, t), lerp(this.y, other.y, t));
    }

    scale(scalar: number): Vec2 {
        return new Vec2(this.x * scalar, this.y * scalar);
    }

    add(other: Vec2): Vec2 {
        return new Vec2(this.x + other.x, this.y + other.y);
    }
}
