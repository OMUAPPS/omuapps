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
    public static readonly SCALE_2D = new Mat4(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
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

    public multiply(mat: Mat4): Mat4 {
        return new Mat4(
            this.m00 * mat.m00 + this.m01 * mat.m10 + this.m02 * mat.m20 + this.m03 * mat.m30,
            this.m00 * mat.m01 + this.m01 * mat.m11 + this.m02 * mat.m21 + this.m03 * mat.m31,
            this.m00 * mat.m02 + this.m01 * mat.m12 + this.m02 * mat.m22 + this.m03 * mat.m32,
            this.m00 * mat.m03 + this.m01 * mat.m13 + this.m02 * mat.m23 + this.m03 * mat.m33,
            this.m10 * mat.m00 + this.m11 * mat.m10 + this.m12 * mat.m20 + this.m13 * mat.m30,
            this.m10 * mat.m01 + this.m11 * mat.m11 + this.m12 * mat.m21 + this.m13 * mat.m31,
            this.m10 * mat.m02 + this.m11 * mat.m12 + this.m12 * mat.m22 + this.m13 * mat.m32,
            this.m10 * mat.m03 + this.m11 * mat.m13 + this.m12 * mat.m23 + this.m13 * mat.m33,
            this.m20 * mat.m00 + this.m21 * mat.m10 + this.m22 * mat.m20 + this.m23 * mat.m30,
            this.m20 * mat.m01 + this.m21 * mat.m11 + this.m22 * mat.m21 + this.m23 * mat.m31,
            this.m20 * mat.m02 + this.m21 * mat.m12 + this.m22 * mat.m22 + this.m23 * mat.m32,
            this.m20 * mat.m03 + this.m21 * mat.m13 + this.m22 * mat.m23 + this.m23 * mat.m33,
            this.m30 * mat.m00 + this.m31 * mat.m10 + this.m32 * mat.m20 + this.m33 * mat.m30,
            this.m30 * mat.m01 + this.m31 * mat.m11 + this.m32 * mat.m21 + this.m33 * mat.m31,
            this.m30 * mat.m02 + this.m31 * mat.m12 + this.m32 * mat.m22 + this.m33 * mat.m32,
            this.m30 * mat.m03 + this.m31 * mat.m13 + this.m32 * mat.m23 + this.m33 * mat.m33,
        );
    }

    public scale(scalar: number): Mat4 {
        return new Mat4(
            this.m00 * scalar, this.m01 * scalar, this.m02 * scalar, this.m03 * scalar,
            this.m10 * scalar, this.m11 * scalar, this.m12 * scalar, this.m13 * scalar,
            this.m20 * scalar, this.m21 * scalar, this.m22 * scalar, this.m23 * scalar,
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
