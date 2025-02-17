import { Mat3 } from './mat3.js';
import { Mat4 } from './mat4.js';
import { Vec2 } from './vec2.js';

export class Transform2D {
    constructor(
        public columns: readonly [Vec2, Vec2, Vec2],
    ) { }

    public tdotx(p_v: Vec2): number {
        return this.columns[0].x * p_v.x + this.columns[1].x * p_v.y;
    }

    public tdoty(p_v: Vec2): number {
        return this.columns[0].y * p_v.x + this.columns[1].y * p_v.y;
    }

    public basisXForm(point: Vec2): Vec2 {
        return new Vec2(
            this.tdotx(point),
            this.tdoty(point)
        );
    }

    public xform(point: Vec2): Vec2 {
        return new Vec2(
            this.tdotx(point),
            this.tdoty(point)
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
        const col0 = new Vec2(this.columns[1].y, -this.columns[0].y).scale(invDet);
        const col1 = new Vec2(-this.columns[1].x, this.columns[0].x).scale(invDet);
        const col2 = col0.scale(-this.columns[2].x).add(col1.scale(-this.columns[2].y));
        return new Transform2D([col0, col1, col2]);
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
