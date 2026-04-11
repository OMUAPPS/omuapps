import type { Game } from '../../core/game';
import type { SceneData, SceneHandler } from '../scene';
import ScreenSettings from './ScreenSettings.svelte';

// --- Global Constants ---
const DATE_FONT_FAMILY = 'Zen Maru Gothic';
const DATE_FONT_WEIGHT = '600';
const DEFAULT_FONT_FAMILY = 'Noto Sans JP';

// --- Layout & Visual Constants ---
const PHOTO_ROTATION_DEG = -15;
const OVERLAY_ROTATION_DEG = -3;
const PHOTO_SCALE = 1.25;

const ITEM_LAYOUT_SPACE = 400;
const ITEM_LAYOUT_Y_OFFSET = 400;

const CLIENT_CONTAINER_SHRINK = { x: 100, y: 100 };
const OVERLAY_CONTAINER_SHRINK = { x: -150, y: -10 };

const CLIENT_DUMMY_Y_OFFSET = 0;
const CANVAS_GLOW_WIDTH = 6;

const CLIENT_DATE_FONT_SIZE = 42;
const OVERLAY_DATE_FONT_SIZE = 74;
const DATE_TEXT_POSITION = { x: 0.1, y: 0.75 };
const DATE_TEXT_SHADOW_OFFSET = { x: 2, y: 2 };

export interface SceneSettingsData {
    type: 'settings';
    prev: SceneData;
}

export class SceneSettings implements SceneHandler<SceneSettingsData> {
    public readonly component = ScreenSettings;

    constructor(private readonly game: Game) {}

    /**
     * メインハンドラ
     */
    async handle(scene: SceneSettingsData) {
        const { input: eventPipeline } = this.game.pipeline;
        const { input } = this.game;

        for (const event of eventPipeline) {
            input.clear();
            await input.handle(event);
        }
    }
}
