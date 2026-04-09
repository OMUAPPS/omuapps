import { Transform2D } from '$lib/math/transform2d';
import type { Vec2Like } from '$lib/math/vec2';
import { clone, validateVec2, type ValidateResult } from './helper';

export interface Transform {
    right: Vec2Like;
    up: Vec2Like;
    offset: Vec2Like;
}

export const DEFAULT_TRANSFORM: Transform = {
    right: { x: 1, y: 0 },
    up: { x: 0, y: 1 },
    offset: { x: 0, y: 0 },
};

export function createTransform() {
    return clone(DEFAULT_TRANSFORM);
}

export function validateTransform(transform: Transform): ValidateResult<Transform> {
    if (!transform.right || !transform.up || !transform.offset) {
        return { type: 'invalid', message: 'Transform must have right, up, and offset vectors' };
    }
    const rightResult = validateVec2(transform.right);
    if (rightResult.type === 'invalid') {
        return { type: 'invalid', message: `Invalid right vector: ${rightResult.message}` };
    }
    const upResult = validateVec2(transform.up);
    if (upResult.type === 'invalid') {
        return { type: 'invalid', message: `Invalid up vector: ${upResult.message}` };
    }
    const offsetResult = validateVec2(transform.offset);
    if (offsetResult.type === 'invalid') {
        return { type: 'invalid', message: `Invalid offset vector: ${offsetResult.message}` };
    }
    return {
        type: 'valid',
        value: {
            right: rightResult.value,
            up: upResult.value,
            offset: offsetResult.value,
        },
    };
}

export function getTransform(transform: Transform): Transform2D {
    const _transform = new Transform2D([
        transform.right,
        transform.up,
        transform.offset,
    ]);
    if (_transform.determinant() === 0) {
        return new Transform2D(
            [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 0 }],
        );
    }
    return _transform;
}
