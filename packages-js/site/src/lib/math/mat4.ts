import { AABB2, type AABB2Like } from './aabb2.js';
import { Mat2 } from './mat2.js';
import { Mat3 } from './mat3.js';
import { Quaternion } from './quaternion.js';
import { Vec2, type Vec2Like } from './vec2.js';
import { Vec3, type Vec3Like } from './vec3.js';
import { Vec4, type Vec4Like } from './vec4.js';

export type Mat4Like = {
    m00: number; m01: number; m02: number; m03: number;
    m10: number; m11: number; m12: number; m13: number;
    m20: number; m21: number; m22: number; m23: number;
    m30: number; m31: number; m32: number; m33: number;
};

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

    /**
     * internally:
     *
     * | m00 m01 m02 m03 |
     * | m10 m11 m12 m13 |
     * | m20 m21 m22 m23 |
     * | m30 m31 m32 m33 |
     *
     * exported to WebGL as column-major Float32Array
     */
    public readonly elements: Float32Array;

    constructor(
        readonly m00: number, readonly m01: number, readonly m02: number, readonly m03: number,
        readonly m10: number, readonly m11: number, readonly m12: number, readonly m13: number,
        readonly m20: number, readonly m21: number, readonly m22: number, readonly m23: number,
        readonly m30: number, readonly m31: number, readonly m32: number, readonly m33: number,
    ) {
        // column-major for WebGL
        this.elements = new Float32Array([
            m00, m10, m20, m30,
            m01, m11, m21, m31,
            m02, m12, m22, m32,
            m03, m13, m23, m33,
        ]);
    }

    public static from(mat4like: Mat4Like): Mat4 {
        return new Mat4(
            mat4like.m00, mat4like.m01, mat4like.m02, mat4like.m03,
            mat4like.m10, mat4like.m11, mat4like.m12, mat4like.m13,
            mat4like.m20, mat4like.m21, mat4like.m22, mat4like.m23,
            mat4like.m30, mat4like.m31, mat4like.m32, mat4like.m33,
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

    public multiply3(mat: Mat3): Mat4 {
        const nm00 = this.m00 * mat.m00 + this.m10 * mat.m01 + this.m20 * mat.m02;
        const nm01 = this.m01 * mat.m00 + this.m11 * mat.m01 + this.m21 * mat.m02;
        const nm02 = this.m02 * mat.m00 + this.m12 * mat.m01 + this.m22 * mat.m02;
        const nm03 = this.m03;
        const nm10 = this.m00 * mat.m10 + this.m10 * mat.m11 + this.m20 * mat.m12;
        const nm11 = this.m01 * mat.m10 + this.m11 * mat.m11 + this.m21 * mat.m12;
        const nm12 = this.m02 * mat.m10 + this.m12 * mat.m11 + this.m22 * mat.m12;
        const nm13 = this.m13;
        const nm20 = this.m00 * mat.m20 + this.m10 * mat.m21 + this.m20 * mat.m22;
        const nm21 = this.m01 * mat.m20 + this.m11 * mat.m21 + this.m21 * mat.m22;
        const nm22 = this.m02 * mat.m20 + this.m12 * mat.m21 + this.m22 * mat.m22;
        const nm23 = this.m23;
        return new Mat4(
            nm00, nm01, nm02, nm03,
            nm10, nm11, nm12, nm13,
            nm20, nm21, nm22, nm23,
            this.m30, this.m31, this.m32, this.m33,
        );
    }

    public lerp(right: Mat4, t: number): Mat4 {
        return new Mat4(
            this.m00 + (right.m00 - this.m00) * t, this.m01 + (right.m01 - this.m01) * t, this.m02 + (right.m02 - this.m02) * t, this.m03 + (right.m03 - this.m03) * t,
            this.m10 + (right.m10 - this.m10) * t, this.m11 + (right.m11 - this.m11) * t, this.m12 + (right.m12 - this.m12) * t, this.m13 + (right.m13 - this.m13) * t,
            this.m20 + (right.m20 - this.m20) * t, this.m21 + (right.m21 - this.m21) * t, this.m22 + (right.m22 - this.m22) * t, this.m23 + (right.m23 - this.m23) * t,
            this.m30 + (right.m30 - this.m30) * t, this.m31 + (right.m31 - this.m31) * t, this.m32 + (right.m32 - this.m32) * t, this.m33 + (right.m33 - this.m33) * t,
        );
    }

    public inverse(): Mat4 {
        const det = this.determinant();
        if (det === 0) {
            return Mat4.ZERO;
        }
        const invDet = 1 / det;
        const nm00 = (this.m12 * this.m23 * this.m31 - this.m13 * this.m22 * this.m31 + this.m13 * this.m21 * this.m32 - this.m11 * this.m23 * this.m32 - this.m12 * this.m21 * this.m33 + this.m11 * this.m22 * this.m33) * invDet;
        const nm01 = (this.m03 * this.m22 * this.m31 - this.m02 * this.m23 * this.m31 - this.m03 * this.m21 * this.m32 + this.m01 * this.m23 * this.m32 + this.m02 * this.m21 * this.m33 - this.m01 * this.m22 * this.m33) * invDet;
        const nm02 = (this.m02 * this.m13 * this.m31 - this.m03 * this.m12 * this.m31 + this.m03 * this.m11 * this.m32 - this.m01 * this.m13 * this.m32 - this.m02 * this.m11 * this.m33 + this.m01 * this.m12 * this.m33) * invDet;
        const nm03 = (this.m03 * this.m12 * this.m21 - this.m02 * this.m13 * this.m21 - this.m03 * this.m11 * this.m22 + this.m01 * this.m13 * this.m22 + this.m02 * this.m11 * this.m23 - this.m01 * this.m12 * this.m23) * invDet;
        const nm10 = (this.m13 * this.m22 * this.m30 - this.m12 * this.m23 * this.m30 - this.m13 * this.m20 * this.m32 + this.m10 * this.m23 * this.m32 + this.m12 * this.m20 * this.m33 - this.m10 * this.m22 * this.m33) * invDet;
        const nm11 = (this.m02 * this.m23 * this.m30 - this.m03 * this.m22 * this.m30 + this.m03 * this.m20 * this.m32 - this.m00 * this.m23 * this.m32 - this.m02 * this.m20 * this.m33 + this.m00 * this.m22 * this.m33) * invDet;
        const nm12 = (this.m03 * this.m12 * this.m30 - this.m02 * this.m13 * this.m30 - this.m03 * this.m10 * this.m32 + this.m00 * this.m13 * this.m32 + this.m02 * this.m10 * this.m33 - this.m00 * this.m12 * this.m33) * invDet;
        const nm13 = (this.m02 * this.m13 * this.m20 - this.m03 * this.m12 * this.m20 + this.m03 * this.m10 * this.m22 - this.m00 * this.m13 * this.m22 - this.m02 * this.m10 * this.m23 + this.m00 * this.m12 * this.m23) * invDet;
        const nm20 = (this.m11 * this.m23 * this.m30 - this.m13 * this.m21 * this.m30 + this.m13 * this.m20 * this.m31 - this.m10 * this.m23 * this.m31 - this.m11 * this.m20 * this.m33 + this.m10 * this.m21 * this.m33) * invDet;
        const nm21 = (this.m03 * this.m21 * this.m30 - this.m01 * this.m23 * this.m30 - this.m03 * this.m20 * this.m31 + this.m00 * this.m23 * this.m31 + this.m01 * this.m20 * this.m33 - this.m00 * this.m21 * this.m33) * invDet;
        const nm22 = (this.m01 * this.m13 * this.m30 - this.m03 * this.m11 * this.m30 + this.m03 * this.m10 * this.m31 - this.m00 * this.m13 * this.m31 - this.m01 * this.m10 * this.m33 + this.m00 * this.m11 * this.m33) * invDet;
        const nm23 = (this.m03 * this.m11 * this.m20 - this.m01 * this.m13 * this.m20 - this.m03 * this.m10 * this.m21 + this.m00 * this.m13 * this.m21 + this.m01 * this.m10 * this.m23 - this.m00 * this.m11 * this.m23) * invDet;
        const nm30 = (this.m12 * this.m21 * this.m30 - this.m11 * this.m22 * this.m30 - this.m12 * this.m20 * this.m31 + this.m10 * this.m22 * this.m31 + this.m11 * this.m20 * this.m32 - this.m10 * this.m21 * this.m32) * invDet;
        const nm31 = (this.m01 * this.m22 * this.m30 - this.m02 * this.m21 * this.m30 + this.m02 * this.m20 * this.m31 - this.m00 * this.m22 * this.m31 - this.m01 * this.m20 * this.m32 + this.m00 * this.m21 * this.m32) * invDet;
        const nm32 = (this.m02 * this.m11 * this.m30 - this.m01 * this.m12 * this.m30 - this.m02 * this.m10 * this.m31 + this.m00 * this.m12 * this.m31 + this.m01 * this.m10 * this.m32 - this.m00 * this.m11 * this.m32) * invDet;
        const nm33 = (this.m01 * this.m12 * this.m20 - this.m02 * this.m11 * this.m20 + this.m02 * this.m10 * this.m21 - this.m00 * this.m12 * this.m21 - this.m01 * this.m10 * this.m22 + this.m00 * this.m11 * this.m22) * invDet;
        return new Mat4(
            nm00, nm01, nm02, nm03,
            nm10, nm11, nm12, nm13,
            nm20, nm21, nm22, nm23,
            nm30, nm31, nm32, nm33,
        );
    }

    public decompose(): { translation: Vec3; rotation: Quaternion; scale: Vec3 } {
        const translation = new Vec3(this.m30, this.m31, this.m32);

        // row-vector / row-major 想定で、各「行」の長さをスケールとして取る
        const scaleX = Math.hypot(this.m00, this.m01, this.m02);
        const scaleY = Math.hypot(this.m10, this.m11, this.m12);
        const scaleZ = Math.hypot(this.m20, this.m21, this.m22);

        const invScaleX = scaleX !== 0 ? 1 / scaleX : 0;
        const invScaleY = scaleY !== 0 ? 1 / scaleY : 0;
        const invScaleZ = scaleZ !== 0 ? 1 / scaleZ : 0;

        // quaternion 抽出用に、正規化した 3x3 を「転置して」入れる
        const r00 = this.m00 * invScaleX;
        const r01 = this.m10 * invScaleY;
        const r02 = this.m20 * invScaleZ;
        const r10 = this.m01 * invScaleX;
        const r11 = this.m11 * invScaleY;
        const r12 = this.m21 * invScaleZ;
        const r20 = this.m02 * invScaleX;
        const r21 = this.m12 * invScaleY;
        const r22 = this.m22 * invScaleZ;

        const trace = r00 + r11 + r22;

        let x: number, y: number, z: number, w: number;

        if (trace > 0) {
            const s = Math.sqrt(trace + 1.0) * 2;
            w = 0.25 * s;
            x = (r21 - r12) / s;
            y = (r02 - r20) / s;
            z = (r10 - r01) / s;
        } else if (r00 > r11 && r00 > r22) {
            const s = Math.sqrt(1.0 + r00 - r11 - r22) * 2;
            w = (r21 - r12) / s;
            x = 0.25 * s;
            y = (r01 + r10) / s;
            z = (r02 + r20) / s;
        } else if (r11 > r22) {
            const s = Math.sqrt(1.0 + r11 - r00 - r22) * 2;
            w = (r02 - r20) / s;
            x = (r01 + r10) / s;
            y = 0.25 * s;
            z = (r12 + r21) / s;
        } else {
            const s = Math.sqrt(1.0 + r22 - r00 - r11) * 2;
            w = (r10 - r01) / s;
            x = (r02 + r20) / s;
            y = (r12 + r21) / s;
            z = 0.25 * s;
        }

        const rotation = new Quaternion(x, y, z, w).normalize();

        return {
            translation,
            rotation,
            scale: new Vec3(scaleX, scaleY, scaleZ),
        };
    }

    public transformAABB2(aabb: AABB2Like): AABB2 {
        const { min, max } = aabb;
        const leftTop: Vec2Like = min;
        const leftBottom: Vec2Like = { x: min.x, y: max.y };
        const rightTop: Vec2Like = { x: max.x, y: min.y };
        const rightBottom: Vec2Like = max;
        return AABB2.fromPoints([
            this.transform2(leftTop),
            this.transform2(leftBottom),
            this.transform2(rightTop),
            this.transform2(rightBottom),
        ]);
    }

    public basisTransformAABB2(aabb: AABB2Like): AABB2 {
        const { min, max } = aabb;
        const leftTop: Vec2Like = min;
        const leftBottom: Vec2Like = { x: min.x, y: max.y };
        const rightTop: Vec2Like = { x: max.x, y: min.y };
        const rightBottom: Vec2Like = max;
        return AABB2.fromPoints([
            this.basisTransform2(leftTop),
            this.basisTransform2(leftBottom),
            this.basisTransform2(rightTop),
            this.basisTransform2(rightBottom),
        ]);
    }

    public equals(other: Mat4): boolean {
        return (
            this.m00 === other.m00 && this.m01 === other.m01 && this.m02 === other.m02 && this.m03 === other.m03 &&
            this.m10 === other.m10 && this.m11 === other.m11 && this.m12 === other.m12 && this.m13 === other.m13 &&
            this.m20 === other.m20 && this.m21 === other.m21 && this.m22 === other.m22 && this.m23 === other.m23 &&
            this.m30 === other.m30 && this.m31 === other.m31 && this.m32 === other.m32 && this.m33 === other.m33
        );
    }

    public asMat2(): Mat2 {
        return new Mat2(
            this.m00, this.m01,
            this.m10, this.m11,
        );
    }

    public static translation(x: number, y: number, z: number): Mat4 {
        return new Mat4(
            1, 0, 0, x,
            0, 1, 0, y,
            0, 0, 1, z,
            0, 0, 0, 1,
        );
    }

    public static scaling(x: number, y: number, z: number): Mat4 {
        return new Mat4(
            x, 0, 0, 0,
            0, y, 0, 0,
            0, 0, z, 0,
            0, 0, 0, 1,
        );
    }

    public static rotationX(angle: number): Mat4 {
        const c = Math.cos(angle);
        const s = Math.sin(angle);

        return new Mat4(
            1, 0, 0, 0,
            0, c, -s, 0,
            0, s, c, 0,
            0, 0, 0, 1,
        );
    }

    public static rotationY(angle: number): Mat4 {
        const c = Math.cos(angle);
        const s = Math.sin(angle);

        return new Mat4(
            c, 0, s, 0,
            0, 1, 0, 0,
            -s, 0, c, 0,
            0, 0, 0, 1,
        );
    }

    public static rotationZ(angle: number): Mat4 {
        const c = Math.cos(angle);
        const s = Math.sin(angle);

        return new Mat4(
            c, -s, 0, 0,
            s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        );
    }

    public static rotation(q: Quaternion): Mat4 {
        const xx = q.x * q.x;
        const yy = q.y * q.y;
        const zz = q.z * q.z;

        const xy = q.x * q.y;
        const xz = q.x * q.z;
        const yz = q.y * q.z;

        const wx = q.w * q.x;
        const wy = q.w * q.y;
        const wz = q.w * q.z;

        return new Mat4(
            1 - 2 * (yy + zz),
            2 * (xy - wz),
            2 * (xz + wy),
            0,

            2 * (xy + wz),
            1 - 2 * (xx + zz),
            2 * (yz - wx),
            0,

            2 * (xz - wy),
            2 * (yz + wx),
            1 - 2 * (xx + yy),
            0,

            0, 0, 0, 1,
        );
    }

    public static perspective(
        fov: number,
        aspect: number,
        near: number,
        far: number,
    ): Mat4 {
        const f = 1 / Math.tan(fov / 2);

        return new Mat4(
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) / (near - far), (2 * far * near) / (near - far),
            0, 0, -1, 0,
        );
    }

    public static orthographic(
        left: number,
        top: number,
        right: number,
        bottom: number,
        near: number,
        far: number,
    ): Mat4 {
        return new Mat4(
            2 / (right - left),
            0,
            0,
            -(right + left) / (right - left),

            0,
            2 / (top - bottom),
            0,
            -(top + bottom) / (top - bottom),

            0,
            0,
            -2 / (far - near),
            -(far + near) / (far - near),

            0,
            0,
            0,
            1,
        );
    }

    public multiply(b: Mat4Like): Mat4 {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const a = this;

        return new Mat4(
            a.m00 * b.m00 + a.m01 * b.m10 + a.m02 * b.m20 + a.m03 * b.m30,
            a.m00 * b.m01 + a.m01 * b.m11 + a.m02 * b.m21 + a.m03 * b.m31,
            a.m00 * b.m02 + a.m01 * b.m12 + a.m02 * b.m22 + a.m03 * b.m32,
            a.m00 * b.m03 + a.m01 * b.m13 + a.m02 * b.m23 + a.m03 * b.m33,

            a.m10 * b.m00 + a.m11 * b.m10 + a.m12 * b.m20 + a.m13 * b.m30,
            a.m10 * b.m01 + a.m11 * b.m11 + a.m12 * b.m21 + a.m13 * b.m31,
            a.m10 * b.m02 + a.m11 * b.m12 + a.m12 * b.m22 + a.m13 * b.m32,
            a.m10 * b.m03 + a.m11 * b.m13 + a.m12 * b.m23 + a.m13 * b.m33,

            a.m20 * b.m00 + a.m21 * b.m10 + a.m22 * b.m20 + a.m23 * b.m30,
            a.m20 * b.m01 + a.m21 * b.m11 + a.m22 * b.m21 + a.m23 * b.m31,
            a.m20 * b.m02 + a.m21 * b.m12 + a.m22 * b.m22 + a.m23 * b.m32,
            a.m20 * b.m03 + a.m21 * b.m13 + a.m22 * b.m23 + a.m23 * b.m33,

            a.m30 * b.m00 + a.m31 * b.m10 + a.m32 * b.m20 + a.m33 * b.m30,
            a.m30 * b.m01 + a.m31 * b.m11 + a.m32 * b.m21 + a.m33 * b.m31,
            a.m30 * b.m02 + a.m31 * b.m12 + a.m32 * b.m22 + a.m33 * b.m32,
            a.m30 * b.m03 + a.m31 * b.m13 + a.m32 * b.m23 + a.m33 * b.m33,
        );
    }

    public translate(x: number, y: number, z: number): Mat4 {
        return this.multiply(Mat4.translation(x, y, z));
    }

    public scale(x: number, y: number, z: number): Mat4 {
        return this.multiply(Mat4.scaling(x, y, z));
    }

    public rotateX(angle: number): Mat4 {
        return this.multiply(Mat4.rotationX(angle));
    }

    public rotateY(angle: number): Mat4 {
        return this.multiply(Mat4.rotationY(angle));
    }

    public rotateZ(angle: number): Mat4 {
        return this.multiply(Mat4.rotationZ(angle));
    }

    public rotate(q: Quaternion): Mat4 {
        return this.multiply(Mat4.rotation(q));
    }

    public transpose(): Mat4 {
        return new Mat4(
            this.m00, this.m10, this.m20, this.m30,
            this.m01, this.m11, this.m21, this.m31,
            this.m02, this.m12, this.m22, this.m32,
            this.m03, this.m13, this.m23, this.m33,
        );
    }

    public transform2(v: Vec2Like): Vec2 {
        const x = this.m00 * v.x + this.m01 * v.y + this.m03;
        const y = this.m10 * v.x + this.m11 * v.y + this.m13;

        return new Vec2(x, y);
    }

    public transform3(v: Vec3Like): Vec3 {
        const x =
            this.m00 * v.x +
            this.m01 * v.y +
            this.m02 * v.z +
            this.m03;

        const y =
            this.m10 * v.x +
            this.m11 * v.y +
            this.m12 * v.z +
            this.m13;

        const z =
            this.m20 * v.x +
            this.m21 * v.y +
            this.m22 * v.z +
            this.m23;

        return new Vec3(x, y, z);
    }

    public basisTransform2(v: Vec2Like): Vec2 {
        const x = this.m00 * v.x + this.m01 * v.y;
        const y = this.m10 * v.x + this.m11 * v.y;

        return new Vec2(x, y);
    }

    public determinant(): number {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const m = this;

        return (
            m.m03 * m.m12 * m.m21 * m.m30 - m.m02 * m.m13 * m.m21 * m.m30 -
            m.m03 * m.m11 * m.m22 * m.m30 + m.m01 * m.m13 * m.m22 * m.m30 +
            m.m02 * m.m11 * m.m23 * m.m30 - m.m01 * m.m12 * m.m23 * m.m30 -

            m.m03 * m.m12 * m.m20 * m.m31 + m.m02 * m.m13 * m.m20 * m.m31 +
            m.m03 * m.m10 * m.m22 * m.m31 - m.m00 * m.m13 * m.m22 * m.m31 -
            m.m02 * m.m10 * m.m23 * m.m31 + m.m00 * m.m12 * m.m23 * m.m31 +

            m.m03 * m.m11 * m.m20 * m.m32 - m.m01 * m.m13 * m.m20 * m.m32 -
            m.m03 * m.m10 * m.m21 * m.m32 + m.m00 * m.m13 * m.m21 * m.m32 +
            m.m01 * m.m10 * m.m23 * m.m32 - m.m00 * m.m11 * m.m23 * m.m32 -

            m.m02 * m.m11 * m.m20 * m.m33 + m.m01 * m.m12 * m.m20 * m.m33 +
            m.m02 * m.m10 * m.m21 * m.m33 - m.m00 * m.m12 * m.m21 * m.m33 -
            m.m01 * m.m10 * m.m22 * m.m33 + m.m00 * m.m11 * m.m22 * m.m33
        );
    }

    public get offset(): Vec4 {
        return new Vec4(
            this.m03,
            this.m13,
            this.m23,
            this.m33,
        );
    }

    public setOffset(offset: Vec4Like): Mat4 {
        return new Mat4(
            this.m00, this.m01, this.m02, offset.x,
            this.m10, this.m11, this.m12, offset.y,
            this.m20, this.m21, this.m22, offset.z,
            this.m30, this.m31, this.m32, offset.w,
        );
    }

    public get basis(): Mat3 {
        return new Mat3(
            this.m00, this.m01, this.m02,
            this.m10, this.m11, this.m12,
            this.m20, this.m21, this.m22,
        );
    }
}
