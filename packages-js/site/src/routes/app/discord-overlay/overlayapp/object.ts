import type { Vec2Like } from '$lib/math/vec2';
import type { Source } from '../discord-overlay-app';

export interface GameObject {
    readonly id: string;
    position: Vec2Like;
    scale: number;
    source: Source;
}
