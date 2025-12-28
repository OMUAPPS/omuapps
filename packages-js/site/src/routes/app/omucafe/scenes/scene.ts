import type { TypedComponent } from '@omujs/ui';
import type { Game } from '../core/game';
import { SceneKitchen, type SceneKitchenData } from './kitchen/kitchen';
import { SceneMainMenu, type SceneMainMenuData } from './main';

export type SceneData = SceneMainMenuData | SceneKitchenData;

export interface SceneHandler<T> {
    component?: TypedComponent<{
        scene: T;
        game: Game;
    }>;
    handle(scene: T): Promise<void>;
}

export class SceneSystem {
    private readonly registry: {
        [key in SceneData['type']]: SceneHandler<Extract<SceneData, { type: key }>>;
    };

    constructor(
        private readonly game: Game,
    ) {
        this.registry = {
            main_menu: new SceneMainMenu(game),
            kitchen: new SceneKitchen(game),
        };
    }

    public getSceneHandler() {
    }

    async handleFrame() {
        const scene = this.game.states.scene.value;
        const handler = this.registry[scene.type];
        // @ts-expect-error Union vs Intersection
        handler.handle(scene);
    }

    public getComponent(data: SceneData) {
        const handler = this.registry[data.type] ?? this.registry.main_menu;
        return handler.component;
    }
}
