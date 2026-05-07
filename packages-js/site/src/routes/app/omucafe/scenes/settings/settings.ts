import type { Game } from '../../core/game';
import type { SceneData, SceneHandler } from '../scene';
import background from './img/asset_vertical_background.png';
import ScreenSettings from './ScreenSettings.svelte';

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
        const { draw, input: eventPipeline } = this.game.pipeline;
        const { renderer, input, asset } = this.game;

        if (this.game.side === 'overlay') {
            const backgroundTex = (await asset.getTextureByUrl(background).promise).unwrap.texture;
            draw.texture(...renderer.bounds.toArray(), backgroundTex);
        }

        for (const event of eventPipeline) {
            input.clear();
            await input.handle(event);
        }
    }
}
