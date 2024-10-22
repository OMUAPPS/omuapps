import { lerp } from './math.js';

export class Vec2 {
    public static ZERO = new Vec2(0, 0);

    constructor(
        public readonly x: number,
        public readonly y: number,
    ) {}

    public lerp(other: Vec2, t: number): Vec2 {
        return new Vec2(lerp(this.x, other.x, t), lerp(this.y, other.y, t));
    }

    public scale(scalar: number): Vec2 {
        return new Vec2(this.x * scalar, this.y * scalar);
    }

    public add(other: Vec2): Vec2 {
        return new Vec2(this.x + other.x, this.y + other.y);
    }

    public max(other: Vec2): Vec2 {
        return new Vec2(Math.max(this.x, other.x), Math.max(this.y, other.y));
    }

    public min(other: Vec2): Vec2 {
        return new Vec2(Math.min(this.x, other.x), Math.min(this.y, other.y));
    }

    public rotate(angle: number): Vec2 {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vec2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
    }
}
