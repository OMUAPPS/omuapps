import type { RenderPipeline } from '$lib/components/canvas/pipeline';
import { Timer } from '$lib/timer';
import { FridgeSystem } from '../fridge';
import { ItemSystem } from '../item';
import { AttributeRegistry } from '../item/attribute-registry';
import { ItemRenderer } from '../item/renderer';
import type { GameSide, OmucafeApp } from '../omucafe-app';
import { SceneSystem, type SceneData } from '../scenes/scene';
import { Trashbin } from '../trashbin';
import { AssetManager } from './asset';
import { GameRenderer } from './game-renderer';
import { GameState } from './game-state';
import { InputSystem } from './input-system';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UpdateEvent {

}

export class Game {
    private static INSTANCE: Game;

    public renderer: GameRenderer;
    public asset: AssetManager;
    public input: InputSystem;
    public item: ItemSystem;
    public itemRenderer: ItemRenderer;
    public attribute: AttributeRegistry;
    public scene: SceneSystem;
    public fridge: FridgeSystem;
    public trashbin: Trashbin;
    public readonly side: GameSide;

    constructor(
        public readonly app: OmucafeApp,
        public readonly pipeline: RenderPipeline,
        public readonly states: GameState,
    ) {
        this.side = app.side;
        this.asset = new AssetManager(this);
        this.input = new InputSystem(this);
        this.renderer = new GameRenderer(this);
        this.attribute = AttributeRegistry.new(this);
        this.item = new ItemSystem(this);
        this.itemRenderer = new ItemRenderer(this);
        this.scene = new SceneSystem(this);
        this.fridge = new FridgeSystem(this);
        this.trashbin = new Trashbin(this);

        Game.INSTANCE = this;
        if (app.side === 'client') {
            app.omu.dashboard.requestDragDrop().then((handler) => {
                handler.onDrop(async (event) => {
                    const response = await handler.read(event.drag_id);
                    for (const key in response.files) {
                        const file = response.files[key];
                        await this.scene.handleFile(file.buffer);
                    }
                });
            });
        }
    }

    public startTransition(scene: SceneData) {
        this.states.transition.value = {
            current: {
                to: scene,
                start: Timer.now(),
            },
        };
    }

    public static getInstance(): Game {
        return Game.INSTANCE;
    }

    public async startLoop() {
        for await (const frame of this.pipeline) {
            this.pipeline.context.stateManager.setViewport({ x: this.pipeline.matrices.width, y: this.pipeline.matrices.height });
            await this.renderer.prepare();
            await this.scene.handleFrame();
            await this.renderer.renderTransition();
            await this.input.render();
            await this.states.flush();
        }
    }
}
