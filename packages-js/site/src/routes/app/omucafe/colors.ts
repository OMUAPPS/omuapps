import { Vec4 } from '$lib/math/vec4';

export const PALETTE_RGB = {
    BACKGROUND: new Vec4(246 / 255, 242 / 255, 235 / 255, 1),
    ACCENT: new Vec4(11 / 255, 111 / 255, 114 / 255, 1),
    OVERLAY_BACKGROUND: new Vec4(1, 1, 1, 0.5),
    OVERLAY_OUTLINE: new Vec4(1, 1, 1, 0.75),
    TOOLTIP_TEXT: new Vec4(1, 1, 1, 1),
    TOOLTIP_BG: new Vec4(0, 0, 0, 1),
    ITEM_SHADOW: new Vec4(0, 0, 0, 0.2),
};
