import type { Vec2 } from './vec2.js';

export interface Path {
    getPoint(t: number): Vec2;
}