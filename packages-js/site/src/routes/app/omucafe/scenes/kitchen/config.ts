import { CLIENT_RESOLUTION } from '../../core/game-renderer';

export interface SceneKitchenData {
    type: 'kitchen';
    display?: {
        type: 'welcome';
    };
    editMode?: {
        type: 'kitchen';
        timestamp: number;
    };
}

/** シーン全体の設定とマジックナンバーの集約 */
export const SCENE_CONFIG = {
    DESIGN: {
        WIDTH: CLIENT_RESOLUTION.x,
        HEIGHT: CLIENT_RESOLUTION.y,
        COUNTER_WIDTH: (CLIENT_RESOLUTION.x / 7) * 4,
        COUNTER_HEIGHT: 300,
    },
    OFFSETS: {
        DISPLAY: {
            MAX_SUB_1: { x: 1160, y: 1105 },
            MAX_SUB_2: { x: 310, y: 635 },
        },
        OVERLAY: {
            KITCHEN_Y: -200,
            COUNTER_Y: 200,
            TRASHBIN_X: 400,
        },
        CLIENT: {
            COUNTER_Y: -300,
        },
    },
    UI: {
        FONT_FAMILY: 'Noto Sans JP',
        BUTTON_RADIUS: 8,
        ORDER_LIST: {
            SCROLL_SPEED: 0.5,
            ITEM_SPACING: 50,
            AVATAR_SIZE: 48,
        },
        BOARD: {
            DURATION_MS: 15000,
            ITEMS_PER_PAGE: 2,
        },
        EDIT_MODE: {
            WAVE_SPEED_DIVISOR: 1000,
            GRADIENT_HEIGHT: 200,
        },
    },
} as const;
