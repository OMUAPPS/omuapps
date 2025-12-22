<script lang="ts">
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import { GlContext } from '$lib/components/canvas/glcontext.js';
    import type { RenderPipeline } from '$lib/components/canvas/pipeline.js';
    import { DiscordOverlayApp } from '../discord-overlay-app.js';
    import type { RPCSpeakingStates, RPCVoiceStates } from '../discord/discord.js';
    import { EffectManager } from '../effects/effect-manager.js';
    import { AppRenderer } from '../overlayapp/app-renderer.js';

    interface Props {
        overlayApp: DiscordOverlayApp;
        voiceState: RPCVoiceStates;
        speakingState: RPCSpeakingStates;
        takeScreenshot?: () => Promise<void>;
    }

    let {
        overlayApp,
        voiceState,
        speakingState,
        takeScreenshot = $bindable(),
    }: Props = $props();
    const { config } = overlayApp;

    let appRenderer: AppRenderer;
    let pipeline: RenderPipeline;
    let context: GlContext;

    let effectManager: EffectManager;
    let fps = $state(0);
    const fpsCounter = {
        count: 0,
        fps: 0,
    };

    async function setPipeline(newPipeline: RenderPipeline) {
        pipeline = newPipeline;
        context = pipeline.context;

        effectManager = await EffectManager.new(context, () => $config);
        appRenderer = new AppRenderer(
            pipeline,
            overlayApp,
            effectManager,
            () => voiceState,
            () => speakingState,
        );

        takeScreenshot = async () => {
            await appRenderer.screenshotSystem.takeScreenshot();
        };

        for await (const frame of pipeline) {
            const start = frame.time.stamp;
            if (fpsCounter.count > 60) {
                fps = fpsCounter.fps / fpsCounter.count;
                fpsCounter.count = 0;
                fpsCounter.fps = 0;
            }
            await appRenderer.handleFrame(pipeline.input);
            const end = performance.now();
            const renderTime = end - start;
            fpsCounter.fps += 1000 / renderTime;
            fpsCounter.count ++;
        }
    }
</script>

<div class="canvas">
    <div class="debug">
        {fps.toFixed(0)}
        <small>FPS</small>
    </div>
    <Canvas {setPipeline} />
</div>

<style lang="scss">
    .canvas {
        position: absolute;
        inset: 0;
    }

    .debug {
        position: absolute;
        right: 0.25rem;
        bottom: 0.25rem;
        color: var(--color-outline);
        font-size: 0.8rem;
    }
</style>
