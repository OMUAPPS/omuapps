import { lerp } from './math.js';

export class Vec2 {
    public static ZERO = new Vec2(0, 0);
    public static ONE = new Vec2(1, 1);

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

    public mul(other: Vec2): Vec2 {
        return new Vec2(this.x * other.x, this.y * other.y);
    }

    public dot(other: Vec2): number {
        return this.x * other.x + this.y * other.y;
    }

    public add(other: Vec2): Vec2 {
        return new Vec2(this.x + other.x, this.y + other.y);
    }

    public sub(other: Vec2): Vec2 {
        return new Vec2(this.x - other.x, this.y - other.y);
    }

    public length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
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

    public normalize(): Vec2 {
        const len = this.length();
        return new Vec2(this.x / len, this.y / len);
    }

    public toArray(): [number, number] {
        return [this.x, this.y];
    }

    public static fromArray([x, y]: [number, number]): Vec2 {
        return new Vec2(x, y);
    }
}
