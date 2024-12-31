import { Vec2 } from './vec2.js';

export class AABB2 {
    constructor(
        public readonly min: Vec2,
        public readonly max: Vec2,
    ) {}

    public static fromPoints(points: Vec2[]): AABB2 {
        if (points.length === 0) {
            throw new Error('Cannot create AABB from empty list of points');
        }
        const min = points.reduce((acc, p) => acc.min(p), points[0]);
        const max = points.reduce((acc, p) => acc.max(p), points[0]);
        return new AABB2(min, max);
    }

    public contains(point: Vec2): boolean {
        return point.x >= this.min.x && point.x <= this.max.x
            && point.y >= this.min.y && point.y <= this.max.y;
    }

    public intersects(other: AABB2): boolean {
        return this.min.x <= other.max.x && this.max.x >= other.min.x
            && this.min.y <= other.max.y && this.max.y >= other.min.y;
    }

    public shrink(amount: Vec2): AABB2 {
        return new AABB2(this.min.add(amount), this.max.sub(amount));
    }

    public expand(amount: Vec2): AABB2 {
        return new AABB2(this.min.sub(amount), this.max.add(amount));
    }

    public union(other: AABB2): AABB2 {
        return new AABB2(this.min.min(other.min), this.max.max(other.max));
    }

    public overlap(other: AABB2): AABB2 {
        return new AABB2(this.min.max(other.min), this.max.min(other.max));
    }

    public at(position: Vec2): Vec2 {
        return new Vec2(
            this.min.x + (this.max.x - this.min.x) * position.x,
            this.min.y + (this.max.y - this.min.y) * position.y,
        );
    }
    
    public center(): Vec2 {
        return this.min.add(this.max).scale(0.5);
    }

    public size(): Vec2 {
        return this.max.sub(this.min);
    }
}
