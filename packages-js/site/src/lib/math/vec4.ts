import { lerp } from './math.js';
import { Vec2 } from './vec2.js';

export type Vec4Like = { x: number; y: number; z: number; w: number };

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

    public static fromColorHex(hex: string): Vec4 {
        if (hex.startsWith('#')) {
            hex = hex.slice(1);
        }
        let r: number, g: number, b: number, a: number;
        r = g = b = a = 1;
        switch (hex.length) {
            case 1: {
                r = g = b = parseInt(hex, 16) / 16;
                break;
            }
            case 3: {
                r = parseInt(hex.charAt(0), 16) / 16;
                g = parseInt(hex.charAt(1), 16) / 16;
                b = parseInt(hex.charAt(2), 16) / 16;
                break;
            }
            case 4: {
                r = parseInt(hex.charAt(0), 16) / 16;
                g = parseInt(hex.charAt(1), 16) / 16;
                b = parseInt(hex.charAt(2), 16) / 16;
                a = parseInt(hex.charAt(3), 16) / 16;
                break;
            }
            case 6: {
                r = parseInt(hex.slice(0, 2), 16) / 16;
                g = parseInt(hex.slice(2, 4), 16) / 16;
                b = parseInt(hex.slice(4, 6), 16) / 16;
                break;
            }
            case 8: {
                r = parseInt(hex.slice(0, 2), 16) / 16;
                g = parseInt(hex.slice(2, 4), 16) / 16;
                b = parseInt(hex.slice(4, 6), 16) / 16;
                a = parseInt(hex.slice(6, 8), 16) / 16;
                break;
            }
            default: {
                throw new Error(`Unknown color representation: ${hex}`);
            }
        }
        return new Vec4(
            r,
            g,
            b,
            a,
        );
    }

    toColorHex({ alpha }: { alpha?: boolean } = {}) {
        const components = [
            this.x,
            this.y,
            this.z,
        ];
        if (alpha) {
            components.unshift(this.w);
        }
        return components.map((comp) => (comp * 255).toString(16).padStart(2, '0')).join('');
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

    sub(other: Vec4Like): Vec4 {
        return new Vec4(
            this.x - other.x,
            this.y - other.y,
            this.z - other.z,
            this.w - other.w,
        );
    }

    cast2() {
        return new Vec2(this.x, this.y);
    }
}
