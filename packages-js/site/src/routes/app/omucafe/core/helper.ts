import { Vec2, type Vec2Like } from '$lib/math/vec2';

export function clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

// --- Constants ---
const EPOCH_OFFSET = 946684800000;

let counter = 0;
export function generateUid(): string {
    const count = counter++;
    const timestamp = Date.now() - EPOCH_OFFSET;
    return (timestamp + count).toString(36);
}

export type ValidateResult<T> = {
    type: 'valid';
    value: T;
} | {
    type: 'invalid';
    message: string;
};

export function validateVec2(value: Vec2Like): ValidateResult<Vec2> {
    if (typeof value.x !== 'number' || typeof value.y !== 'number') {
        return { type: 'invalid', message: 'Vec2 must have numeric x and y properties' };
    }
    return { type: 'valid', value: new Vec2(value.x, value.y) };
}

export function validateEnum<T>(value: T, validValues: T[]): ValidateResult<T> {
    if (!validValues.includes(value)) {
        return { type: 'invalid', message: `Value must be one of: ${validValues.join(', ')}` };
    }
    return { type: 'valid', value };
}
