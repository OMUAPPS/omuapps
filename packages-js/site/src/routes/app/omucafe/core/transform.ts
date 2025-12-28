import { Transform2D } from '$lib/math/transform2d';
import type { Vec2Like } from '$lib/math/vec2';

export interface Transform {
    right: Vec2Like;
    up: Vec2Like;
    offset: Vec2Like;
}

export const TRANSFORM_ORIGIN: Transform = {
    right: { x: 1, y: 0 },
    up: { x: 0, y: 1 },
    offset: { x: 0, y: 0 },
};

export function getTransform(transform: Transform): Transform2D {
    return new Transform2D([
        transform.right,
        transform.up,
        transform.offset,
    ]);
}
