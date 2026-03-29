import type { TypedComponent } from '@omujs/ui';
import type { Game } from '../core/game';
import { SceneFactory, type SceneFactoryData } from './factory/factory';
import { SceneKitchen, type SceneKitchenData } from './kitchen/kitchen';
import { SceneMainMenu, type SceneMainMenuData } from './main';

export type SceneData = SceneMainMenuData | SceneKitchenData | SceneFactoryData;

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
            factory: new SceneFactory(game),
        };
    }

    public getSceneHandler() {
    }

    async handleFrame() {
        const scene = this.game.states.scene.value;
        const handler = this.registry[scene.type];
        // @ts-expect-error Union vs Intersection
        await handler.handle(scene);
    }

    public getComponent(data: SceneData) {
        const handler = this.registry[data.type] ?? this.registry.main_menu;
        return handler.component;
    }
}
