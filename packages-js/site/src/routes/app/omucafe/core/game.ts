import type { RenderPipeline } from '$lib/components/canvas/pipeline';
import { Timer } from '$lib/timer';
import type { DragDropFile } from '@omujs/omu/api/dashboard';
import { AudioSystem } from '../audio';
import { BoardRenderer } from '../board';
import { Canvas } from '../canvas/canvas';
import { FridgeSystem } from '../fridge';
import { ItemSystem } from '../item';
import { AttributeRegistry } from '../item/attribute-registry';
import { ItemRenderer } from '../item/renderer';
import { NotificationSystem } from '../notification';
import type { GameSide, OmucafeApp } from '../omucafe-app';
import { OrderSystem } from '../order';
import { SceneSystem, type SceneData } from '../scenes/scene';
import { Trashbin } from '../trashbin';
import { AssetManager } from './asset';
import { GameRenderer } from './game-renderer';
import { CafePack, GameState, ItemPack, type TransitionOptions } from './game-state';
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
    public canvas: Canvas;
    public notification: NotificationSystem;
    public boardRenderer: BoardRenderer;
    public order: OrderSystem;
    public audio: AudioSystem;
    public readonly side: GameSide;
    public dragFile: {
        data: DragDropFile;
        time: number;
    } | undefined;
    public tasks: Array<() => Promise<void>> = [];

    constructor(
        public readonly app: OmucafeApp,
        public readonly pipeline: RenderPipeline,
        public readonly states: GameState,
    ) {
        Game.INSTANCE = this;

        this.side = app.side;
        this.audio = new AudioSystem(this);
        this.asset = new AssetManager(this);
        this.input = new InputSystem(this);
        this.renderer = new GameRenderer(this);
        this.attribute = AttributeRegistry.new(this);
        this.item = new ItemSystem(this);
        this.itemRenderer = new ItemRenderer(this);
        this.scene = new SceneSystem(this);
        this.fridge = new FridgeSystem(this);
        this.trashbin = new Trashbin(this);
        this.order = new OrderSystem(this);
        this.canvas = new Canvas(this);
        this.notification = new NotificationSystem(this);
        this.boardRenderer = new BoardRenderer(this);

        if (app.side === 'client') {
            app.omu.dashboard.requestDragDrop().then((handler) => {
                handler.onEnter((event) => {
                    this.dragFile = {
                        data: event.files[0],
                        time: Timer.now(),
                    };
                });
                handler.onLeave(() => {
                    this.dragFile = undefined;
                });
                handler.onDrop(async (event) => {
                    this.addTask(async () => {
                        this.dragFile = undefined;
                        const response = await handler.read(event.drag_id);
                        const files = Object.values(response.files);
                        if (files.length === 0) return;
                        const firstExtension = files[0].file.name.split('.').pop();
                        const extensionsAreConsistent = files.every(({ file }) => file.name.split('.').pop() === firstExtension);
                        if (extensionsAreConsistent) {
                            if (firstExtension === 'cafeitem') {
                                const pack = ItemPack.load(files[0].buffer);
                                this.startTransition({
                                    type: 'factory',
                                }, {
                                    title: `${pack.data.name}を開封中…`,
                                    duration: 500,
                                });
                                setTimeout(() => {
                                    this.addTask(async () => {
                                        await pack.spawn(this);
                                    });
                                }, 250);
                                return;
                            } else if (firstExtension === 'omucafe') {
                                const pack = CafePack.load(files[0].buffer);
                                await pack.apply(this);
                                return;
                            }
                        }
                        for (const file of files) {
                            await this.scene.handleFile(file);
                        }
                    });
                });
            });
        }
    }

    public startTransition(scene: SceneData, options?: TransitionOptions) {
        this.states.transition.value = {
            current: {
                to: scene,
                start: Timer.now(),
                options: options ?? {
                    duration: 750,
                    title: '',
                },
            },
        };
    }

    public static getInstance(): Game {
        return Game.INSTANCE;
    }

    public async startLoop() {
        for await (const _frame of this.pipeline) {
            this.pipeline.context.stateManager.setViewport({ x: this.pipeline.matrices.width, y: this.pipeline.matrices.height });
            await this.renderer.prepare();
            await this.renderer.render(async () => {
                await this.scene.handleFrame();
                await this.renderer.renderTransition();
                await this.renderer.renderDragFile();
                await this.notification.render();
                await this.input.render();
            });
            await this.states.flush();
            await this.processTasks();
        }
    }

    private async processTasks() {
        for (const task of this.tasks) {
            await task();
        }
        this.tasks = [];
    }

    public addTask(task: () => Promise<void>) {
        this.tasks.push(task);
    }
}
