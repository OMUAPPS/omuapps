import type { Input, RenderPipeline } from '$lib/components/canvas/pipeline';
import { Vec2 } from '$lib/math/vec2';
import { Vec4 } from '$lib/math/vec4';
import { get } from 'svelte/store';
import type { DiscordOverlayApp } from '../discord-overlay-app';
import type { RPCSpeakingStates, RPCVoiceStates } from '../discord/discord';
import type { EffectManager } from '../effects/effect-manager';
import { view } from '../states';
import { AvatarManager } from './avatar-manager';
import { AvatarRenderer } from './avatar-renderer';
import { InteractionManager } from './interaction';
import { LayoutEngine } from './layout-engine';
import { ObjectManager } from './object-manager';
import { ScreenRenderer } from './screen-renderer';
import { ScreenshotSystem } from './screenshot';
import { SourceManager } from './source-manager';

export class AppRenderer {
    public readonly dimensions = new Vec2(1920, 1080);

    // Systems
    public readonly sourceManager: SourceManager;
    public readonly avatarManager: AvatarManager;
    public readonly layoutEngine: LayoutEngine;
    public readonly avatarRenderer: AvatarRenderer;
    public readonly screenRenderer: ScreenRenderer;
    public readonly objectManager: ObjectManager;
    public readonly screenshotSystem: ScreenshotSystem;
    public readonly interaction: InteractionManager;

    constructor(
        public readonly pipeline: RenderPipeline,
        public readonly overlayApp: DiscordOverlayApp,
        public readonly effectManager: EffectManager,
        private readonly getVoiceState: () => RPCVoiceStates,
        private readonly getSpeakingState: () => RPCSpeakingStates,
    ) {
        this.sourceManager = new SourceManager(this);
        this.avatarManager = new AvatarManager(this);
        this.layoutEngine = new LayoutEngine(this);
        this.avatarRenderer = new AvatarRenderer(this);
        this.screenRenderer = new ScreenRenderer(this);
        this.objectManager = new ObjectManager(this);
        this.screenshotSystem = new ScreenshotSystem(this);
        this.interaction = new InteractionManager(this);
    }

    get config() { return get(this.overlayApp.config); }
    get world() { return get(this.overlayApp.world); }
    get voiceState() { return this.getVoiceState(); }
    get speakingState() { return this.getSpeakingState(); }

    async handleFrame(input: Input) {
        this.setupWorldMatrices();
        view.set(this.pipeline.matrices.get());

        this.interaction.handleInput(input);
        await this.renderFrame();

        this.resetMatrices();
    }

    async renderFrame() {
        const { gl } = this.pipeline.context;
        const { width, height } = gl.canvas;

        this.prepareGL();
        gl.viewport(0, 0, width, height);

        if (this.overlayApp.isOnClient()) {
            this.drawBackground();
        }

        await this.avatarRenderer.drawAvatars();
        await this.objectManager.drawObjects();
        await this.layoutEngine.drawHeldTips();
        await this.screenRenderer.drawScreen();
    }

    resetMatrices() {
        this.pipeline.matrices.identity();
        this.pipeline.matrices.projection.orthographic(
            0, 0,
            this.pipeline.matrices.width,
            this.pipeline.matrices.height,
            -1, 1,
        );
    }

    setupWorldMatrices() {
        const { gl } = this.pipeline.context;
        const { width, height } = gl.canvas;

        this.pipeline.matrices.identity();
        this.pipeline.matrices.projection.orthographic(0, 0, width, height, -1, 1);

        if (this.overlayApp.isOnAsset()) {
            return;
        }

        const start = new Vec2(50, 150);
        const end = new Vec2(50, 150);
        const screen = new Vec2(width, height);
        const inner = screen.sub(start).sub(end);
        const scaleVector = inner.div(this.dimensions);
        const scale = Math.min(scaleVector.x, scaleVector.y);

        this.pipeline.matrices.view.translate(start.x, start.y, 0);
        const space = inner.sub(this.dimensions.scale(scale)).scale(0.5);
        this.pipeline.matrices.view.translate(space.x, space.y, 0);
        this.pipeline.matrices.view.scale(scale, scale, scale);

        view.set(this.pipeline.matrices.get());
    }

    prepareGL() {
        const { gl } = this.pipeline.context;
        gl.colorMask(true, true, true, true);
        gl.enable(gl.BLEND);
        gl.clearColor(1, 1, 1, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }

    drawBackground() {
        this.pipeline.draw.rectangle(0, 0, this.dimensions.x, this.dimensions.y, new Vec4(1, 1, 1, 1));
    }
}
