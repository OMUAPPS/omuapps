import type { GlTexture } from '$lib/components/canvas/glcontext';
import { AABB2 } from '$lib/math/aabb2';
import { Vec2 } from '$lib/math/vec2';
import type { Game } from '../../core/game';
import { createTransform } from '../../core/transform';
import type { PoolOptions } from '../../item/item';
import packageUrl from '../../resources/img/package.png';
import packageOpenUrl from '../../resources/img/package_open.png';
import packageOpenFrontUrl from '../../resources/img/package_open_front.png';
import type { SceneHandler } from '../scene';
import ScreenExport from './ScreenExport.svelte';
import backgroundUrl from './img/export_background.png';

export interface SceneExportData {
    type: 'export';
}

interface SceneLayout {
    exportOptions: PoolOptions;
    trashbin: Vec2;
    packageBounds: AABB2;
    packageOpenBounds: AABB2;
}

interface SceneAssets {
    background: GlTexture;
    package: GlTexture;
    packageOpen: GlTexture;
    packageOpenFront: GlTexture;
}

export class SceneExport implements SceneHandler<SceneExportData> {
    component = ScreenExport;

    constructor(
        private readonly game: Game,
    ) {}

    private async loadAssets(): Promise<SceneAssets> {
        const { asset } = this.game;
        const [background, packageTex, packageOpenTex, packageOpenFrontTex] = await Promise.all([
            asset.getTextureByUrl(backgroundUrl).promise,
            asset.getTextureByUrl(packageUrl).promise,
            asset.getTextureByUrl(packageOpenUrl).promise,
            asset.getTextureByUrl(packageOpenFrontUrl).promise,
        ]);
        return {
            background: background.unwrap.texture,
            package: packageTex.unwrap.texture,
            packageOpen: packageOpenTex.unwrap.texture,
            packageOpenFront: packageOpenFrontTex.unwrap.texture,
        };
    }

    private createLayout(assets: SceneAssets): SceneLayout {
        const { states } = this.game;
        const offset = new Vec2(0, 300);
        const packageBounds = new AABB2(
            new Vec2(-assets.package.width, -assets.package.height),
            new Vec2(assets.package.width, assets.package.height),
        ).scale(0.75).offset(offset);
        const packageOpenBounds = new AABB2(
            new Vec2(-assets.packageOpen.width, -assets.packageOpen.height),
            new Vec2(assets.packageOpen.width, assets.packageOpen.height),
        ).scale(0.75).offset(offset);
        const exportOptions: PoolOptions = {
            bounds: packageBounds.with({ min: { y: packageBounds.min.y - 100 }, max: { y: packageBounds.center.y + 300 } }),
            name: 'パッケージ',
            ordering: 'lower',
            pool: states.exportPool.value,
            transform: createTransform(),
            align: Vec2.CENTER,
        };
        const { renderer } = this.game;
        return {
            exportOptions,
            trashbin: new Vec2(renderer.bounds.max.x - 400, renderer.bounds.max.y),
            packageBounds,
            packageOpenBounds,
        };
    }

    async handle(scene: SceneExportData): Promise<void> {
        const assets = await this.loadAssets();
        const layout = this.createLayout(assets);
        const { draw } = this.game.pipeline;
        const { bounds } = this.game.renderer;
        draw.texture(...bounds.toArray(), assets.background);
        draw.texture(
            ...layout.packageBounds.toArray(),
            assets.package,
        );
        draw.texture(
            ...layout.packageOpenBounds.toArray(),
            assets.packageOpen,
        );

        const { itemRenderer, fridge, trashbin, states } = this.game;
        itemRenderer.initPass();
        await itemRenderer.renderPool(states.exportPool.value, layout.exportOptions);
        draw.texture(
            ...layout.packageOpenBounds.toArray(),
            assets.packageOpenFront,
        );
        await trashbin.render(layout.trashbin);
        await fridge.render();
        await itemRenderer.renderHeld();
        await this.processInput(layout);
    }

    private async processInput(layout: SceneLayout) {
        const { input: eventPipeline } = this.game.pipeline;
        const { item, fridge, input: inputSystem, trashbin, states } = this.game;

        for (const event of eventPipeline) {
            inputSystem.clear();
            item.initPass();

            // 判定は手前にあるものから順に行う
            await fridge.handleInput(event);
            await trashbin.handleInput(event);
            await item.handleMouse(states.exportPool.value, layout.exportOptions, event);

            item.endInput();
            await inputSystem.handle(event);
        }
    }
}
