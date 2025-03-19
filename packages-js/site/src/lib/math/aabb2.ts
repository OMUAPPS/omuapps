import { Vec2, type PossibleVec2 } from './vec2.js';

export class AABB2 {
    constructor(
        public readonly min: Vec2,
        public readonly max: Vec2,
    ) {}

    public static from({ min, max }: { min: PossibleVec2, max: PossibleVec2 }): AABB2 {
        return new AABB2(new Vec2(min.x, min.y), new Vec2(max.x, max.y));
    }

    public static fromPoints(points: PossibleVec2[]): AABB2 {
        if (points.length === 0) {
            throw new Error('Cannot create AABB from empty list of points');
        }
        const [first, ...rest] = points;
        let min = new Vec2(first.x, first.y);
        let max = new Vec2(first.x, first.y);
        for (const point of rest) {
            min = min.min(point);
            max = max.max(point);
        }
        return new AABB2(min, max);
    }

    public contains(point: PossibleVec2): boolean {
        return point.x >= this.min.x && point.x <= this.max.x
            && point.y >= this.min.y && point.y <= this.max.y;
    }

    public intersects(other: AABB2): boolean {
        return this.min.x <= other.max.x && this.max.x >= other.min.x
            && this.min.y <= other.max.y && this.max.y >= other.min.y;
    }

    public shrink(amount: PossibleVec2): AABB2 {
        return new AABB2(this.min.add(amount), this.max.sub(amount));
    }

    public expand(amount: PossibleVec2): AABB2 {
        return new AABB2(this.min.sub(amount), this.max.add(amount));
    }

    public multiply(amount: PossibleVec2): AABB2 {
        return new AABB2(this.min.mul(amount), this.max.mul(amount));
    }

    public union(other: AABB2): AABB2 {
        return new AABB2(this.min.min(other.min), this.max.max(other.max));
    }

    public overlap(other: AABB2): AABB2 {
        return new AABB2(this.min.max(other.min), this.max.min(other.max));
    }

    public at(position: PossibleVec2): Vec2 {
        return new Vec2(
            this.min.x + (this.max.x - this.min.x) * position.x,
            this.min.y + (this.max.y - this.min.y) * position.y,
        );
    }

    public setAt(at: PossibleVec2, target: PossibleVec2): AABB2 {
        const offset = this.at(at).sub(target);
        return new AABB2(this.min.sub(offset), this.max.sub(offset));
    }
    
    public center(): Vec2 {
        return this.min.add(this.max).scale(0.5);
    }

    public centered(center: PossibleVec2): AABB2 {
        const centerOffset = this.center().sub(center);
        return new AABB2(this.min.sub(centerOffset), this.max.sub(centerOffset));
    }


    public dimensions(): Vec2 {
        return this.max.sub(this.min);
    }
}
