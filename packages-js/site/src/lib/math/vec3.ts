import { lerp } from './math.js';

export class Vec3 {
    public static ZERO = new Vec3(0, 0, 0);

    constructor(
        public readonly x: number,
        public readonly y: number,
        public readonly z: number,
    ) {}

    public lerp(other: Vec3, t: number): Vec3 {
        return new Vec3(lerp(this.x, other.x, t), lerp(this.y, other.y, t), lerp(this.z, other.z, t));
    }

    public add(other: Vec3): Vec3 {
        return new Vec3(this.x + other.x, this.y + other.y, this.z + other.z);
    }

    public scale(scalar: number): Vec3 {
        return new Vec3(this.x * scalar, this.y * scalar, this.z * scalar);
    }

    public min(other: Vec3): Vec3 {
        return new Vec3(Math.min(this.x, other.x), Math.min(this.y, other.y), Math.min(this.z, other.z));
    }

    public max(other: Vec3): Vec3 {
        return new Vec3(Math.max(this.x, other.x), Math.max(this.y, other.y), Math.max(this.z, other.z));
    }
}
