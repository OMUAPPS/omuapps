import type { Vec3 } from './vec3.js';

export class AABB3 {
    constructor(
        public readonly min: Vec3,
        public readonly max: Vec3,
    ) {}

    public static fromPoints(points: Vec3[]): AABB3 {
        const min = points.reduce((acc, p) => acc.min(p), points[0]);
        const max = points.reduce((acc, p) => acc.max(p), points[0]);
        return new AABB3(min, max);
    }

    public contains(point: Vec3): boolean {
        return point.x >= this.min.x && point.x <= this.max.x
            && point.y >= this.min.y && point.y <= this.max.y
            && point.z >= this.min.z && point.z <= this.max.z;
    }

    public intersects(other: AABB3): boolean {
        return this.min.x <= other.max.x && this.max.x >= other.min.x
            && this.min.y <= other.max.y && this.max.y >= other.min.y
            && this.min.z <= other.max.z && this.max.z >= other.min.z;
    }
}
