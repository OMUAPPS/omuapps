export class Mat2 {
    public static readonly IDENTITY = new Mat2(1, 0, 0, 1);
    public readonly elements: Float32Array;

    constructor(m00: number, m01: number, m10: number, m11: number) {
        this.elements = new Float32Array([m00, m01, m10, m11]);
    }

    get m00(): number {
        return this.elements[0];
    }

    get m01(): number {
        return this.elements[1];
    }

    get m10(): number {
        return this.elements[2];
    }

    get m11(): number {
        return this.elements[3];
    }

    public add(mat: Mat2): Mat2 {
        return new Mat2(
            this.m00 + mat.m00,
            this.m01 + mat.m01,
            this.m10 + mat.m10,
            this.m11 + mat.m11
        );
    }

    public multiply(mat: Mat2): Mat2 {
        return new Mat2(
            this.m00 * mat.m00 + this.m01 * mat.m10,
            this.m00 * mat.m01 + this.m01 * mat.m11,
            this.m10 * mat.m00 + this.m11 * mat.m10,
            this.m10 * mat.m01 + this.m11 * mat.m11
        );
    }

    public scale(scalar: number): Mat2 {
        return new Mat2(
            this.m00 * scalar,
            this.m01 * scalar,
            this.m10 * scalar,
            this.m11 * scalar
        );
    }

    public determinant(): number {
        return this.m00 * this.m11 - this.m01 * this.m10;
    }

    public transpose(): Mat2 {
        return new Mat2(
            this.m00,
            this.m10,
            this.m01,
            this.m11
        );
    }

    public inverse(): Mat2 | null {
        const det = this.determinant();
        if (det === 0) {
            return null;
        }
        const invDet = 1 / det;
        return new Mat2(
            this.m11 * invDet,
            -this.m01 * invDet,
            -this.m10 * invDet,
            this.m00 * invDet
        );
    }
}
