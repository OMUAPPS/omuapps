import { lerp } from './math.js';

export type Vec4Like = { x: number, y: number, z: number, w: number };

export class Vec4 {
    public static ZERO = new Vec4(0, 0, 0, 0);
    public static ONE = new Vec4(1, 1, 1, 1);

    constructor(
        public readonly x: number,
        public readonly y: number,
        public readonly z: number,
        public readonly w: number,
    ) {}

    public static from(vec: Vec4Like): Vec4 {
        return new Vec4(vec.x, vec.y, vec.z, vec.w);
    }

    equal(other: Vec4Like): boolean {
        return this.x === other.x && this.y === other.y && this.z === other.z && this.w === other.w;
    }

    scale(scalar: number): Vec4 {
        return new Vec4(
            this.x * scalar,
            this.y * scalar,
            this.z * scalar,
            this.w * scalar,
        );
    }

    lerp(other: Vec4Like, t: number): Vec4 {
        return new Vec4(
            lerp(this.x, other.x, t),
            lerp(this.y, other.y, t),
            lerp(this.z, other.z, t),
            lerp(this.w, other.w, t),
        );
    }

    add(other: Vec4Like): Vec4 {
        return new Vec4(
            this.x + other.x,
            this.y + other.y,
            this.z + other.z,
            this.w + other.w,
        );
    }
}
