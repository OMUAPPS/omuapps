import { Vec4 } from '$lib/math/vec4.js';

function toHex(color: Vec4): string {
    return '#' + [color.x, color.y, color.z, color.w].map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
}

export const PALETTE_RGB = {
    ACCENT: new Vec4(11 / 255, 111 / 255, 114 / 255, 1),
    BACKGROUND_1: new Vec4(246 / 255, 242 / 255, 235 / 255, 1.0),
    BACKGROUND_1_TRANSPARENT: new Vec4(246 / 255, 242 / 255, 235 / 255, 0.98),
    BACKGROUND_2: new Vec4(255 / 255, 254 / 255, 252 / 255, 1.0),
    BACKGROUND_2_TRANSPARENT: new Vec4(255 / 255, 254 / 255, 252 / 255, 0.98),
    BACKGROUND_3: new Vec4(1, 1, 1, 0.5),
    OUTLINE_1: new Vec4(230 / 255, 230 / 255, 230 / 255, 1.0),
    OUTLINE_2: new Vec4(0, 0, 0, 0.2),
    TOOLTIP_BACKGROUND: new Vec4(0, 0, 0, 1),
    TOOLTIP_TEXT: new Vec4(1, 1, 1, 1),
};

export const PALETTE_HEX: Record<keyof typeof PALETTE_RGB, string> = Object.fromEntries(
    Object.entries(PALETTE_RGB).map(([key, value]) => [key, toHex(value)]),
) as Record<keyof typeof PALETTE_RGB, string>;
