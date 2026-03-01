import type { RenderPipeline } from '$lib/components/canvas/pipeline';
import { ItemSystem } from '../item';
import type { OmucafeApp } from '../omucafe-app';
import { SceneSystem } from '../scenes/scene';
import { AssetManager } from './asset';
import { GameRenderer } from './game-renderer';
import { GameState } from './game-state';
import { InputSystem } from './input-system';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UpdateEvent {

}

export class Game {
    public gameRenderer: GameRenderer;
    public assetManager: AssetManager;
    public inputSystem: InputSystem;
    public itemSystem: ItemSystem;
    public sceneSystem: SceneSystem;

    constructor(
        public readonly app: OmucafeApp,
        public readonly pipeline: RenderPipeline,
        public readonly states: GameState,
    ) {
        this.assetManager = new AssetManager(app.omu, pipeline);
        this.inputSystem = new InputSystem(this);
        this.gameRenderer = new GameRenderer(this);
        this.itemSystem = new ItemSystem(this);
        this.sceneSystem = new SceneSystem(this);
    }

    public async loop() {
        for await (const frame of this.pipeline) {
            this.pipeline.context.stateManager.setViewport({ x: this.pipeline.matrices.width, y: this.pipeline.matrices.height });
            await this.gameRenderer.clear();
            this.inputSystem.clear();
            await this.sceneSystem.handleFrame();
            await this.inputSystem.render();
            await this.states.flush();
        }
    }
}
