import { Quaternion } from './quaternion.js';

export class Axis {
    public static readonly X_POS = new Axis((rad) => new Quaternion(0, 0, 0, 1).rotationX(rad));
    public static readonly X_NEG = new Axis((rad) => new Quaternion(0, 0, 0, 1).rotationX(-rad));
    public static readonly Y_POS = new Axis((rad) => new Quaternion(0, 0, 0, 1).rotationY(rad));
    public static readonly Y_NEG = new Axis((rad) => new Quaternion(0, 0, 0, 1).rotationY(-rad));
    public static readonly Z_POS = new Axis((rad) => new Quaternion(0, 0, 0, 1).rotationZ(rad));
    public static readonly Z_NEG = new Axis((rad) => new Quaternion(0, 0, 0, 1).rotationZ(-rad));

    constructor(
        public readonly rotation: (rad: number) => Quaternion,
    ) {}

    public rotate(rad: number): Quaternion {
        return this.rotation(rad);
    }

    public rotateDeg(deg: number): Quaternion {
        return this.rotation(deg * Math.PI / 180);
    }
}
