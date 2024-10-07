export class Quaternion {
    constructor(
        public readonly x: number,
        public readonly y: number,
        public readonly z: number,
        public readonly w: number,
    ) {}

    public normalize(): Quaternion {
        const inversedLength = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
        return new Quaternion(
            this.x / inversedLength,
            this.y / inversedLength,
            this.z / inversedLength,
            this.w / inversedLength,
        );
    }

    public rotationX(angle: number): Quaternion {
        const halfAngle = angle / 2;
        return new Quaternion(
            Math.sin(halfAngle),
            0,
            0,
            Math.cos(halfAngle),
        );
    }

    public rotationY(angle: number): Quaternion {
        const halfAngle = angle / 2;
        return new Quaternion(
            0,
            Math.sin(halfAngle),
            0,
            Math.cos(halfAngle),
        );
    }

    public rotationZ(angle: number): Quaternion {
        const halfAngle = angle / 2;
        return new Quaternion(
            0,
            0,
            Math.sin(halfAngle),
            Math.cos(halfAngle),
        );
    }
}
