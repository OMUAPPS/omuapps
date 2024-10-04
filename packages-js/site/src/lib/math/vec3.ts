import { lerp } from './math.js';

export class Vec3 {
    public static ZERO = new Vec3(0, 0, 0);

    constructor(
        public readonly x: number,
        public readonly y: number,
        public readonly z: number,
    ) {}

    lerp(other: Vec3, t: number): Vec3 {
        return new Vec3(lerp(this.x, other.x, t), lerp(this.y, other.y, t), lerp(this.z, other.z, t));
    }

    add(other: Vec3): Vec3 {
        return new Vec3(this.x + other.x, this.y + other.y, this.z + other.z);
    }
}
