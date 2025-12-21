import type { Vec2Like } from '$lib/math/vec2';
import type { Source } from '../discord-overlay-app';

export interface GameObject {
    position: Vec2Like;
    source: Source;
}
