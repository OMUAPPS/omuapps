import { Mat3 } from './mat3.js';
import { Mat4 } from './mat4.js';
import { Vec2 } from './vec2.js';

export class Transform2D {
    constructor(
        public columns: [Vec2, Vec2, Vec2],
    ) { }

    public basisXForm(point: Vec2): Vec2 {
        return new Vec2(
            this.columns[0].dot(point),
            this.columns[1].dot(point)
        );
    }

    public xform(point: Vec2): Vec2 {
        return new Vec2(
            this.columns[0].dot(point),
            this.columns[1].dot(point)
        ).add(this.columns[2]);
    }

    public determinant(): number {
        return this.columns[0].x * this.columns[1].y - this.columns[0].y * this.columns[1].x;
    }

    public affineInverse(): Transform2D {
        const det = this.determinant();
        if (det === 0) {
            throw new Error('Matrix is not invertible');
        }

        const invDet = 1 / det;
        return new Transform2D([
            new Vec2(this.columns[1].y * invDet, this.columns[0].y * -invDet),
            new Vec2(this.columns[1].x * -invDet, this.columns[0].x * invDet),
            this.basisXForm(this.columns[2].scale(-1))
        ]);
    }

    public multiply(other: Transform2D): Transform2D {
        return new Transform2D([
            this.basisXForm(other.columns[0]),
            this.basisXForm(other.columns[1]),
            this.xform(other.columns[2])
        ]);
    }

    get origin(): Vec2 {
        return this.columns[2];
    }

    public getMat3(): Mat3 {
        return new Mat3(
            this.columns[0].x, this.columns[0].y, 0,
            this.columns[1].x, this.columns[1].y, 0,
            this.columns[2].x, this.columns[2].y, 1
        );
    }

    public getMat4(): Mat4 {
        return new Mat4(
            this.columns[0].x, this.columns[0].y, 0, 0,
            this.columns[1].x, this.columns[1].y, 0, 0,
            0, 0, 1, 0,
            this.columns[2].x, this.columns[2].y, 0, 1
        );
    }
}
