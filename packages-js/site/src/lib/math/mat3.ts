export class Mat3 {
    public static IDENTITY = new Mat3(1, 0, 0, 0, 1, 0, 0, 0, 1);
    public readonly elements: Float32Array;

    constructor(
        m00: number, m01: number, m02: number,
        m10: number, m11: number, m12: number,
        m20: number, m21: number, m22: number,
    ) {
        this.elements = new Float32Array([m00, m01, m02, m10, m11, m12, m20, m21, m22]);
    }

    get m00() {
        return this.elements[0];
    }
    
    get m01() {
        return this.elements[1];
    }
    
    get m02() {
        return this.elements[2];
    }
    
    get m10() {
        return this.elements[3];
    }
    
    get m11() {
        return this.elements[4];
    }
    
    get m12() {
        return this.elements[5];
    }
    
    get m20() {
        return this.elements[6];
    }
    
    get m21() {
        return this.elements[7];
    }
    
    get m22() {
        return this.elements[8];
    }

    public add(mat: Mat3): Mat3 {
        return new Mat3(
            this.m00 + mat.m00, this.m01 + mat.m01, this.m02 + mat.m02,
            this.m10 + mat.m10, this.m11 + mat.m11, this.m12 + mat.m12,
            this.m20 + mat.m20, this.m21 + mat.m21, this.m22 + mat.m22,
        );
    }

    public multiply(mat: Mat3): Mat3 {
        return new Mat3(
            this.m00 * mat.m00 + this.m01 * mat.m10 + this.m02 * mat.m20,
            this.m00 * mat.m01 + this.m01 * mat.m11 + this.m02 * mat.m21,
            this.m00 * mat.m02 + this.m01 * mat.m12 + this.m02 * mat.m22,
            this.m10 * mat.m00 + this.m11 * mat.m10 + this.m12 * mat.m20,
            this.m10 * mat.m01 + this.m11 * mat.m11 + this.m12 * mat.m21,
            this.m10 * mat.m02 + this.m11 * mat.m12 + this.m12 * mat.m22,
            this.m20 * mat.m00 + this.m21 * mat.m10 + this.m22 * mat.m20,
            this.m20 * mat.m01 + this.m21 * mat.m11 + this.m22 * mat.m21,
            this.m20 * mat.m02 + this.m21 * mat.m12 + this.m22 * mat.m22,
        );
    }

    public scale(scalar: number): Mat3 {
        return new Mat3(
            this.m00 * scalar, this.m01 * scalar, this.m02 * scalar,
            this.m10 * scalar, this.m11 * scalar, this.m12 * scalar,
            this.m20 * scalar, this.m21 * scalar, this.m22 * scalar,
        );
    }

    public determinant(): number {
        return (
            this.m00 * this.m11 * this.m22 +
            this.m01 * this.m12 * this.m20 +
            this.m02 * this.m10 * this.m21 -
            this.m02 * this.m11 * this.m20 -
            this.m01 * this.m10 * this.m22 -
            this.m00 * this.m12 * this.m21
        );
    }

    public transpose(): Mat3 {
        return new Mat3(
            this.m00, this.m10, this.m20,
            this.m01, this.m11, this.m21,
            this.m02, this.m12, this.m22,
        );
    }

    public inverse(): Mat3 {
        const det = this.determinant();
        if (det === 0) {
            return this;
        }
        const invDet = 1 / det;
        return new Mat3(
            (this.m11 * this.m22 - this.m12 * this.m21) * invDet,
            (this.m02 * this.m21 - this.m01 * this.m22) * invDet,
            (this.m01 * this.m12 - this.m02 * this.m11) * invDet,
            (this.m12 * this.m20 - this.m10 * this.m22) * invDet,
            (this.m00 * this.m22 - this.m02 * this.m20) * invDet,
            (this.m02 * this.m10 - this.m00 * this.m12) * invDet,
            (this.m10 * this.m21 - this.m11 * this.m20) * invDet,
            (this.m01 * this.m20 - this.m00 * this.m21) * invDet,
            (this.m00 * this.m11 - this.m01 * this.m10) * invDet,
        );
    }
}
