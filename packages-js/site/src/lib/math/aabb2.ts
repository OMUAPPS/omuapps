import { invLerp, lerp } from './math.js';
import { Vec2, type Vec2Like } from './vec2.js';

export type AABB2Like = {
    min: Vec2Like;
    max: Vec2Like;
};

export class AABB2 {
    public static readonly ZEROZERO = new AABB2(Vec2.ZERO, Vec2.ZERO);
    public static readonly ONEONE = new AABB2(Vec2.ONE, Vec2.ONE);
    public static readonly ZEROONE = new AABB2(Vec2.ZERO, Vec2.ONE);
    public static readonly CLIPSPACE = new AABB2(new Vec2(-1, -1), new Vec2(1, 1));

    constructor(
        public readonly min: Vec2,
        public readonly max: Vec2,
    ) {}

    public static from({ min, max }: { min: Vec2Like; max: Vec2Like }): AABB2 {
        return new AABB2(new Vec2(min.x, min.y), new Vec2(max.x, max.y));
    }

    public static fromSize({ width, height }: { width: number; height: number }): AABB2 {
        return new AABB2(
            Vec2.ZERO,
            new Vec2(width, height),
        );
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
    public toArray(options?: { flipY?: boolean }): [number, number, number, number] {
        let minY = this.min.y;
        let maxY = this.max.y;
        if (options?.flipY) {
            minY = -minY;
            maxY = -maxY;
        }
        return [
            this.min.x,
            minY,
            this.max.x,
            maxY,
        ];
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

    public with({ min, max }: { min?: Partial<Vec2Like>; max?: Partial<Vec2Like> }): AABB2 {
        return new AABB2(
            min ? this.min.with(min) : this.min,
            max ? this.max.with(max) : this.max,
        );
    }

    public unmap(pos: Vec2Like): Vec2 {
        return new Vec2(
            invLerp(this.min.x, this.max.x, pos.x),
            invLerp(this.min.y, this.max.y, pos.y),
        );
    }

    public map(value: Vec2Like): Vec2 {
        return new Vec2(
            lerp(this.min.x, this.max.x, value.x),
            lerp(this.min.y, this.max.y, value.y),
        );
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

    public fit(dimensions: Vec2Like): AABB2 {
        // Preserve aspect ratio of other within this
        const thisDimensions = this.dimensions();
        const thisAspect = thisDimensions.x / thisDimensions.y;
        const otherAspect = dimensions.x / dimensions.y;

        let scale: number;
        if (otherAspect > thisAspect) {
            // Other is wider than this, fit to width
            scale = thisDimensions.x / dimensions.x;
        } else {
            // Other is taller than this, fit to height
            scale = thisDimensions.y / dimensions.y;
        }

        const center = this.center;
        const halfSize = {
            x: dimensions.x * scale * 0.5,
            y: dimensions.y * scale * 0.5,
        };
        return new AABB2(
            center.sub(halfSize),
            center.add(halfSize),
        );
    }

    public contain(dimensions: Vec2Like): AABB2 {
        const thisDimensions = this.dimensions();

        const scale = Math.max(
            thisDimensions.x / dimensions.x,
            thisDimensions.y / dimensions.y,
        );

        const center = this.center;
        const halfSize = {
            x: dimensions.x * scale * 0.5,
            y: dimensions.y * scale * 0.5,
        };

        return new AABB2(
            center.sub(halfSize),
            center.add(halfSize),
        );
    }

    public split(options: {
        direction: 'x' | 'y';
        ratio: number;
        gap?: number;
    }): [AABB2, AABB2] {
        const gap = options.gap ?? 0;
        if (options.direction === 'x') {
            const splitX = this.min.x + this.width * options.ratio;
            return [
                new AABB2(this.min, new Vec2(splitX - gap, this.max.y)),
                new AABB2(new Vec2(splitX + gap, this.min.y), this.max),
            ];
        } else {
            const splitY = this.min.y + this.height * options.ratio;
            return [
                new AABB2(this.min, new Vec2(this.max.x, splitY - gap)),
                new AABB2(new Vec2(this.min.x, splitY + gap), this.max),
            ];
        }
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

    public setAt(anchor: Vec2Like, position: Vec2Like): AABB2 {
        const offset = this.at(anchor).sub(position);
        return new AABB2(this.min.sub(offset), this.max.sub(offset));
    }

    public get center(): Vec2 {
        return this.min.add(this.max).scale(0.5);
    }

    public centered(center: Vec2Like): AABB2 {
        const centerOffset = this.center.sub(center);
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

    public scaleAt(scaler: number, anchor: Vec2Like): AABB2 {
        const scaledMin = this.min.sub(anchor).scale(scaler).add(anchor);
        const scaledMax = this.max.sub(anchor).scale(scaler).add(anchor);
        return new AABB2(scaledMin, scaledMax);
    }

    public get size(): Vec2 {
        return this.max.sub(this.min);
    }

    public get width(): number {
        return this.max.x - this.min.x;
    }

    public get height(): number {
        return this.max.y - this.min.y;
    }

    public equals(other: AABB2) {
        return this.min.equals(other.min) && this.max.equals(other.max);
    }
}
