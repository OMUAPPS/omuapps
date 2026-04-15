import type { FileData } from '@omujs/omu/api/dashboard';
import type { TypedComponent } from '@omujs/ui';
import type { Game } from '../core/game';
import { SceneExport, type SceneExportData } from './export/export';
import { SceneFactory, type SceneFactoryData } from './factory/factory';
import { SceneKitchen, type SceneKitchenData } from './kitchen/kitchen';
import { SceneMainMenu, type SceneMainMenuData } from './main';
import { ScenePhoto, type ScenePhotoData } from './photo/photo';
import { SceneSettings, type SceneSettingsData } from './settings/settings';

export type SceneData = SceneMainMenuData | SceneKitchenData | SceneFactoryData | ScenePhotoData | SceneSettingsData | SceneExportData;

export interface SceneHandler<T> {
    component?: TypedComponent<{
        scene: T;
        game: Game;
    }>;
    handle(scene: T): Promise<void>;
    handleFile?(scene: T, data: FileData): Promise<void>;
}

export class SceneSystem {
    private readonly registry: {
        [key in SceneData['type']]: SceneHandler<Extract<SceneData, { type: key }>>;
    };
    public readonly main_menu: SceneMainMenu;
    public readonly kitchen: SceneKitchen;
    public readonly factory: SceneFactory;
    public readonly photo: ScenePhoto;
    public readonly settings: SceneSettings;
    public readonly export: SceneExport;

    constructor(
        private readonly game: Game,
    ) {
        this.registry = {
            main_menu: this.main_menu = new SceneMainMenu(game),
            kitchen: this.kitchen = new SceneKitchen(game),
            factory: this.factory = new SceneFactory(game),
            photo: this.photo = new ScenePhoto(game),
            settings: this.settings = new SceneSettings(game),
            export: this.export = new SceneExport(game),
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

    async handleFile(data: FileData) {
        const scene = this.game.states.scene.value;
        const handler = this.registry[scene.type];
        // @ts-expect-error Union vs Intersection
        await handler.handleFile?.(scene, data);
    }

    public getComponent(data: SceneData) {
        const handler = this.registry[data.type] ?? this.registry.main_menu;
        return handler.component;
    }
}
