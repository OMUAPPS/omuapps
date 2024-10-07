import type { Quaternion } from './quaternion.js';

export class Mat4 {
    public static readonly IDENTITY = new Mat4(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    );
    public static readonly ZERO = new Mat4(
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
    );

    public readonly elements: Float32Array;

    constructor(
        readonly m00: number, readonly m01: number, readonly m02: number, readonly m03: number,
        readonly m10: number, readonly m11: number, readonly m12: number, readonly m13: number,
        readonly m20: number, readonly m21: number, readonly m22: number, readonly m23: number,
        readonly m30: number, readonly m31: number, readonly m32: number, readonly m33: number,
    ) {
        this.elements = new Float32Array([
            m00, m01, m02, m03,
            m10, m11, m12, m13,
            m20, m21, m22, m23,
            m30, m31, m32, m33,
        ]);
    }

    public static orthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {
        return new Mat4(
            2 / (right - left), 0, 0, 0,
            0, 2 / (top - bottom), 0, 0,
            0, 0, -2 / (far - near), 0,
            -(right + left) / (right - left), -(top + bottom) / (top - bottom), -(far + near) / (far - near), 1,
        );
    }

    public static perspective(fov: number, aspect: number, near: number, far: number): Mat4 {
        const f = 1 / Math.tan(fov / 2);
        return new Mat4(
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) / (near - far), -1,
            0, 0, (2 * far * near) / (near - far), 0,
        );
    }

    public add(mat: Mat4): Mat4 {
        return new Mat4(
            this.m00 + mat.m00, this.m01 + mat.m01, this.m02 + mat.m02, this.m03 + mat.m03,
            this.m10 + mat.m10, this.m11 + mat.m11, this.m12 + mat.m12, this.m13 + mat.m13,
            this.m20 + mat.m20, this.m21 + mat.m21, this.m22 + mat.m22, this.m23 + mat.m23,
            this.m30 + mat.m30, this.m31 + mat.m31, this.m32 + mat.m32, this.m33 + mat.m33,
        );
    }

    public multiply(right: Mat4): Mat4 {
        const nm00 = this.m00 * right.m00 + this.m01 * right.m10 + this.m02 * right.m20 + this.m03 * right.m30;
        const nm01 = this.m00 * right.m01 + this.m01 * right.m11 + this.m02 * right.m21 + this.m03 * right.m31;
        const nm02 = this.m00 * right.m02 + this.m01 * right.m12 + this.m02 * right.m22 + this.m03 * right.m32;
        const nm03 = this.m00 * right.m03 + this.m01 * right.m13 + this.m02 * right.m23 + this.m03 * right.m33;
        const nm10 = this.m10 * right.m00 + this.m11 * right.m10 + this.m12 * right.m20 + this.m13 * right.m30;
        const nm11 = this.m10 * right.m01 + this.m11 * right.m11 + this.m12 * right.m21 + this.m13 * right.m31;
        const nm12 = this.m10 * right.m02 + this.m11 * right.m12 + this.m12 * right.m22 + this.m13 * right.m32;
        const nm13 = this.m10 * right.m03 + this.m11 * right.m13 + this.m12 * right.m23 + this.m13 * right.m33;
        const nm20 = this.m20 * right.m00 + this.m21 * right.m10 + this.m22 * right.m20 + this.m23 * right.m30;
        const nm21 = this.m20 * right.m01 + this.m21 * right.m11 + this.m22 * right.m21 + this.m23 * right.m31;
        const nm22 = this.m20 * right.m02 + this.m21 * right.m12 + this.m22 * right.m22 + this.m23 * right.m32;
        const nm23 = this.m20 * right.m03 + this.m21 * right.m13 + this.m22 * right.m23 + this.m23 * right.m33;
        const nm30 = this.m30 * right.m00 + this.m31 * right.m10 + this.m32 * right.m20 + this.m33 * right.m30;
        const nm31 = this.m30 * right.m01 + this.m31 * right.m11 + this.m32 * right.m21 + this.m33 * right.m31;
        const nm32 = this.m30 * right.m02 + this.m31 * right.m12 + this.m32 * right.m22 + this.m33 * right.m32;
        const nm33 = this.m30 * right.m03 + this.m31 * right.m13 + this.m32 * right.m23 + this.m33 * right.m33;
        return new Mat4(
            nm00, nm01, nm02, nm03,
            nm10, nm11, nm12, nm13,
            nm20, nm21, nm22, nm23,
            nm30, nm31, nm32, nm33,
        );
    }

    public scale(x: number, y: number, z: number): Mat4 {
        return new Mat4(
            this.m00 * x, this.m01 * y, this.m02 * z, this.m03,
            this.m10 * x, this.m11 * y, this.m12 * z, this.m13,
            this.m20 * x, this.m21 * y, this.m22 * z, this.m23,
            this.m30, this.m31, this.m32, this.m33,
        );
    }

    public translate(x: number, y: number, z: number): Mat4 {
        return new Mat4(
            this.m00, this.m01, this.m02, this.m03,
            this.m10, this.m11, this.m12, this.m13,
            this.m20, this.m21, this.m22, this.m23,
            this.m00 * x + this.m10 * y + this.m20 * z + this.m30,
            this.m01 * x + this.m11 * y + this.m21 * z + this.m31,
            this.m02 * x + this.m12 * y + this.m22 * z + this.m32,
            this.m03 * x + this.m13 * y + this.m23 * z + this.m33,
        );
    }

    public rotateX(angle: number): Mat4 {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return new Mat4(
            this.m00, this.m01, this.m02, this.m03,
            this.m10 * c + this.m20 * s, this.m11 * c + this.m21 * s, this.m12 * c + this.m22 * s, this.m13 * c + this.m23 * s,
            this.m20 * c - this.m10 * s, this.m21 * c - this.m11 * s, this.m22 * c - this.m12 * s, this.m23 * c - this.m13 * s,
            this.m30, this.m31, this.m32, this.m33,
        );
    }

    public rotateY(angle: number): Mat4 {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return new Mat4(
            this.m00 * c - this.m20 * s, this.m01, this.m02 * c - this.m22 * s, this.m03,
            this.m10, this.m11, this.m12, this.m13,
            this.m00 * s + this.m20 * c, this.m01, this.m02 * s + this.m22 * c, this.m03,
            this.m30, this.m31, this.m32, this.m33,
        );
    }

    public rotateZ(angle: number): Mat4 {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return new Mat4(
            this.m00 * c + this.m10 * s, this.m01 * c + this.m11 * s, this.m02 * c + this.m12 * s, this.m03 * c + this.m13 * s,
            this.m10 * c - this.m00 * s, this.m11 * c - this.m01 * s, this.m12 * c - this.m02 * s, this.m13 * c - this.m03 * s,
            this.m20, this.m21, this.m22, this.m23,
            this.m30, this.m31, this.m32, this.m33,
        );
    }
    
    public rotate(quaternion: Quaternion): Mat4 {
        const w2 = quaternion.w * quaternion.w, x2 = quaternion.x * quaternion.x;
        const y2 = quaternion.y * quaternion.y, z2 = quaternion.z * quaternion.z;
        const zw = quaternion.z * quaternion.w, dzw = zw + zw, xy = quaternion.x * quaternion.y, dxy = xy + xy;
        const xz = quaternion.x * quaternion.z, dxz = xz + xz, yw = quaternion.y * quaternion.w, dyw = yw + yw;
        const yz = quaternion.y * quaternion.z, dyz = yz + yz, xw = quaternion.x * quaternion.w, dxw = xw + xw;
        const rm00 = w2 + x2 - z2 - y2;
        const rm01 = dxy + dzw;
        const rm02 = dxz - dyw;
        const rm10 = -dzw + dxy;
        const rm11 = y2 - z2 + w2 - x2;
        const rm12 = dyz + dxw;
        const rm20 = dyw + dxz;
        const rm21 = dyz - dxw;
        const rm22 = z2 - y2 - x2 + w2;
        const nm00 = this.m00 * rm00 + this.m10 * rm01 + this.m20 * rm02;
        const nm01 = this.m01 * rm00 + this.m11 * rm01 + this.m21 * rm02;
        const nm02 = this.m02 * rm00 + this.m12 * rm01 + this.m22 * rm02;
        const nm03 = this.m03 * rm00 + this.m13 * rm01 + this.m23 * rm02;
        const nm10 = this.m00 * rm10 + this.m10 * rm11 + this.m20 * rm12;
        const nm11 = this.m01 * rm10 + this.m11 * rm11 + this.m21 * rm12;
        const nm12 = this.m02 * rm10 + this.m12 * rm11 + this.m22 * rm12;
        const nm13 = this.m03 * rm10 + this.m13 * rm11 + this.m23 * rm12;
        return new Mat4(
            nm00, nm01, nm02, nm03,
            nm10, nm11, nm12, nm13,
            this.m00 * rm20 + this.m10 * rm21 + this.m20 * rm22,
            this.m01 * rm20 + this.m11 * rm21 + this.m21 * rm22,
            this.m02 * rm20 + this.m12 * rm21 + this.m22 * rm22,
            this.m03 * rm20 + this.m13 * rm21 + this.m23 * rm22,
            this.m30, this.m31, this.m32, this.m33,
        );
    }

    public determinant(): number {
        return (
            this.m00 * this.m11 * this.m22 * this.m33 + this.m01 * this.m12 * this.m23 * this.m30 +
            this.m02 * this.m13 * this.m20 * this.m31 + this.m03 * this.m10 * this.m21 * this.m32 -
            this.m03 * this.m12 * this.m21 * this.m30 - this.m02 * this.m10 * this.m23 * this.m31 -
            this.m01 * this.m13 * this.m22 * this.m30 - this.m00 * this.m11 * this.m23 * this.m32
        );
    }

    public transpose(): Mat4 {
        return new Mat4(
            this.m00, this.m10, this.m20, this.m30,
            this.m01, this.m11, this.m21, this.m31,
            this.m02, this.m12, this.m22, this.m32,
            this.m03, this.m13, this.m23, this.m33,
        );
    }

    public inverse(): Mat4 {
        const det = this.determinant();
        if (det === 0) {
            throw new Error('Matrix is not invertible.');
        }
        const invDet = 1 / det;
        return new Mat4(
            invDet * (this.m11 * this.m22 * this.m33 + this.m12 * this.m23 * this.m31 + this.m13 * this.m21 * this.m32 - this.m13 * this.m22 * this.m31 - this.m12 * this.m21 * this.m33 - this.m11 * this.m23 * this.m32),
            invDet * (this.m03 * this.m22 * this.m31 + this.m02 * this.m23 * this.m33 + this.m01 * this.m21 * this.m32 - this.m01 * this.m22 * this.m33 - this.m02 * this.m21 * this.m31 - this.m03 * this.m23 * this.m32),
            invDet * (this.m03 * this.m12 * this.m31 + this.m02 * this.m11 * this.m33 + this.m01 * this.m13 * this.m32 - this.m01 * this.m12 * this.m33 - this.m02 * this.m13 * this.m31 - this.m03 * this.m11 * this.m32),
            invDet * (this.m03 * this.m12 * this.m21 + this.m02 * this.m13 * this.m21 + this.m01 * this.m12 * this.m23 - this.m01 * this.m13 * this.m22 - this.m02 * this.m12 * this.m23 - this.m03 * this.m11 * this.m22),
            invDet * (this.m13 * this.m22 * this.m30 + this.m12 * this.m20 * this.m32 + this.m10 * this.m23 * this.m32 - this.m10 * this.m22 * this.m33 - this.m12 * this.m23 * this.m30 - this.m13 * this.m20 * this.m32),
            invDet * (this.m00 * this.m22 * this.m33 + this.m02 * this.m23 * this.m30 + this.m03 * this.m20 * this.m32 - this.m03 * this.m22 * this.m30 - this.m02 * this.m20 * this.m33 - this.m00 * this.m23 * this.m32),
            invDet * (this.m03 * this.m12 * this.m30 + this.m02 * this.m10 * this.m33 + this.m00 * this.m13 * this.m32 - this.m00 * this.m12 * this.m33 - this.m02 * this.m13 * this.m30 - this.m03 * this.m10 * this.m32),
            invDet * (this.m03 * this.m12 * this.m20 + this.m02 * this.m13 * this.m20 + this.m00 * this.m12 * this.m23 - this.m00 * this.m13 * this.m22 - this.m02 * this.m12 * this.m23 - this.m03 * this.m10 * this.m22),
            invDet * (this.m10 * this.m21 * this.m33 + this.m11 * this.m23 * this.m30 + this.m13 * this.m20 * this.m31 - this.m13 * this.m21 * this.m30 - this.m11 * this.m20 * this.m33 - this.m10 * this.m23 * this.m31),
            invDet * (this.m00 * this.m23 * this.m31 + this.m01 * this.m20 * this.m33 + this.m03 * this.m21 * this.m30 - this.m03 * this.m20 * this.m31 - this.m01 * this.m23 * this.m30 - this.m00 * this.m21 * this.m33),
            invDet * (this.m03 * this.m11 * this.m30 + this.m01 * this.m13 * this.m30 + this.m00 * this.m11 * this.m33 - this.m00 * this.m13 * this.m31 - this.m01 * this.m10 * this.m33 - this.m03 * this.m10 * this.m31),
            invDet * (this.m03 * this.m11 * this.m20 + this.m01 * this.m13 * this.m20 + this.m00 * this.m13 * this.m21 - this.m00 * this.m11 * this.m23 - this.m01 * this.m10 * this.m23 - this.m03 * this.m10 * this.m21),
            invDet * (this.m11 * this.m20 * this.m32 + this.m10 * this.m22 * this.m31 + this.m12 * this.m21 * this.m30 - this.m12 * this.m20 * this.m31 - this.m10 * this.m21 * this.m32 - this.m11 * this.m22 * this.m30),
            invDet * (this.m00 * this.m22 * this.m31 + this.m02 * this.m20 * this.m31 + this.m01 * this.m22 * this.m30 - this.m01 * this.m20 * this.m32 - this.m02 * this.m21 * this.m30 - this.m00 * this.m21 * this.m32),
            invDet * (this.m02 * this.m11 * this.m30 + this.m01 * this.m10 * this.m32 + this.m00 * this.m12 * this.m31 - this.m00 * this.m11 * this.m32 - this.m01 * this.m12 * this.m30 - this.m02 * this.m10 * this.m31),
            invDet * (this.m03 * this.m10 * this.m21 + this.m01 * this.m13 * this.m20 + this.m02 * this.m11 * this.m23 - this.m02 * this.m13 * this.m21 - this.m01 * this.m11 * this.m23 - this.m03 * this.m10 * this.m22),
        );
    }
}
