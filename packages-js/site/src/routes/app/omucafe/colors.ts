import { Vec4 } from '$lib/math/vec4';

const ACCENT = new Vec4(11 / 255, 111 / 255, 114 / 255, 1);
export const PALETTE_RGB = {
    BACKGROUND: new Vec4(246 / 255, 242 / 255, 235 / 255, 1),
    ACCENT,
    OVERLAY_BACKGROUND: new Vec4(1, 1, 1, 0.5),
    OVERLAY_OUTLINE: new Vec4(1, 1, 1, 0.75),
    TOOLTIP_TEXT: new Vec4(1, 1, 1, 1),
    TOOLTIP_BG: new Vec4(0, 0, 0, 1),
    ITEM_SHADOW: new Vec4(0, 0, 0, 0.2),
    CONTAINER_HOVERED: Vec4.fromColorHex('#fff0f033'),
    DISPLAY_BUTTON_TEXT: Vec4.fromColorHex('#ffffff'),
    DISPLAY_BUTTON_BG: ACCENT,
    DISPLAY_BUTTON_HOVERED: ACCENT.with({ w: 0.4 }),
};
