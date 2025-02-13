import { invLerp, lerp } from './math.js';

type PossibleVec2 = Vec2 | [number, number] | { x: number, y: number };

export class Vec2 {
    public static ZERO = new Vec2(0, 0);
    public static ONE = new Vec2(1, 1);
    public static UP = new Vec2(0, 1);
    public static DOWN = new Vec2(0, -1);
    public static LEFT = new Vec2(-1, 0);
    public static RIGHT = new Vec2(1, 0);

    constructor(
        public readonly x: number,
        public readonly y: number,
    ) {}

    public lerp(other: Vec2, t: number): Vec2 {
        return new Vec2(lerp(this.x, other.x, t), lerp(this.y, other.y, t));
    }

    public remap(minIn: Vec2, maxIn: Vec2, minOut: Vec2, maxOut: Vec2): Vec2 {
        return new Vec2(
            lerp(minOut.x, maxOut.x, invLerp(minIn.x, maxIn.x, this.x)),
            lerp(minOut.y, maxOut.y, invLerp(minIn.y, maxIn.y, this.y)),
        );
    }

    public scale(scalar: number): Vec2 {
        return new Vec2(this.x * scalar, this.y * scalar);
    }

    public mul(other: Vec2): Vec2 {
        return new Vec2(this.x * other.x, this.y * other.y);
    }

    public div(other: Vec2): Vec2 {
        return new Vec2(this.x / other.x, this.y / other.y);
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

    public distance(other: Vec2): number {
        return this.sub(other).length();
    }

    public rotate(angle: number): Vec2 {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vec2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
    }

    public turnLeft(): Vec2 {
        return new Vec2(-this.y, this.x);
    }

    public turnRight(): Vec2 {
        return new Vec2(this.y, -this.x);
    }

    public normalize(): Vec2 {
        const len = this.length();
        return new Vec2(this.x / len, this.y / len);
    }

    public toArray(): [number, number] {
        return [this.x, this.y];
    }

    public static from(obj: PossibleVec2): Vec2 {
        if (obj instanceof Vec2) {
            return obj;
        }
        if (Array.isArray(obj)) {
            return new Vec2(obj[0], obj[1]);
        }
        return new Vec2(obj.x, obj.y);
    }
}
