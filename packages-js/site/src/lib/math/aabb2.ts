import { lerp } from './math.js';
import { Vec2, type Vec2Like } from './vec2.js';

export type AABB2Like = {
    min: Vec2Like;
    max: Vec2Like;
};

export class AABB2 {
    public static readonly ZEROZERO = new AABB2(Vec2.ZERO, Vec2.ZERO);
    public static readonly ONEONE = new AABB2(Vec2.ONE, Vec2.ONE);
    public static readonly ZEROONE = new AABB2(Vec2.ONE, Vec2.ONE);

    constructor(
        public readonly min: Vec2,
        public readonly max: Vec2,
    ) {}

    public static from({ min, max }: { min: Vec2Like; max: Vec2Like }): AABB2 {
        return new AABB2(new Vec2(min.x, min.y), new Vec2(max.x, max.y));
    }

    public static fromPoints(points: Vec2Like[]): AABB2 {
        if (points.length === 0) {
            throw new Error('Cannot create AABB from empty list of points');
        }
        const [first, ...rest] = points;
        let minX = first.x;
        let minY = first.y;
        let maxX = first.x;
        let maxY = first.y;
        for (const point of rest) {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }
        return new AABB2(
            new Vec2(minX, minY),
            new Vec2(maxX, maxY),
        );
    }

    public contains(point: Vec2Like): boolean {
        return point.x >= this.min.x && point.x <= this.max.x
            && point.y >= this.min.y && point.y <= this.max.y;
    }

    public intersects(other: AABB2Like): boolean {
        return this.min.x <= other.max.x && this.max.x >= other.min.x
            && this.min.y <= other.max.y && this.max.y >= other.min.y;
    }

    public shrink(amount: Vec2Like): AABB2 {
        return new AABB2(this.min.add(amount), this.max.sub(amount));
    }

    public expand(amount: Vec2Like): AABB2 {
        return new AABB2(this.min.sub(amount), this.max.add(amount));
    }

    public multiply(amount: Vec2Like): AABB2 {
        return new AABB2(this.min.mul(amount), this.max.mul(amount));
    }

    public union(other: AABB2Like): AABB2 {
        return new AABB2(this.min.min(other.min), this.max.max(other.max));
    }

    public overlap(other: AABB2Like): AABB2 {
        return new AABB2(this.min.max(other.min), this.max.min(other.max));
    }

    public offset(position: Vec2Like) {
        return new AABB2(
            this.min.add(position),
            this.max.add(position),
        );
    }

    public at(position: Vec2Like): Vec2 {
        return new Vec2(
            lerp(this.min.x, this.max.x, position.x),
            lerp(this.min.y, this.max.y, position.y),
        );
    }

    public setAt(at: Vec2Like, target: Vec2Like): AABB2 {
        const offset = this.at(at).sub(target);
        return new AABB2(this.min.sub(offset), this.max.sub(offset));
    }

    public center(): Vec2 {
        return this.min.add(this.max).scale(0.5);
    }

    public centered(center: Vec2Like): AABB2 {
        const centerOffset = this.center().sub(center);
        return new AABB2(this.min.sub(centerOffset), this.max.sub(centerOffset));
    }

    public closest(point: Vec2) {
        return this.min.max(point).min(this.max);
    }

    public distance(point: Vec2Like): number {
        const p = this.min.max(point).min(this.max);
        return p.distance(point);
    }

    public dimensions(): Vec2 {
        return this.max.sub(this.min);
    }

    public scale(scaler: number): AABB2 {
        return new AABB2(
            this.min.scale(scaler),
            this.max.scale(scaler),
        );
    }
}
