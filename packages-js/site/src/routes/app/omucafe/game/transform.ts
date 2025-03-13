import { Mat4 } from '$lib/math/mat4.js';
import type { PossibleVec2 } from '$lib/math/vec2.js';

export type Transform = {
    right: PossibleVec2,
    up: PossibleVec2,
    offset: PossibleVec2,
}

export function createTransform(): Transform {
    return {
        right: { x: 1, y: 0 },
        up: { x: 0, y: 1 },
        offset: { x: 0, y: 0 },
    };
}

export type Bounds = {
    min: PossibleVec2,
    max: PossibleVec2,
};

export function transformToMatrix(transform: Transform): Mat4 {
    const { right, up, offset } = transform;
    return new Mat4(
        right.x, right.y, 0, 0,
        up.x, up.y, 0, 0,
        0, 0, 1, 0,
        offset.x, offset.y, 0, 1,
    );
}
