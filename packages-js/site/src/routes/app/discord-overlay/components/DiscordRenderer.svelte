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
            fps = 1000 / frame.time.delta;
            await appRenderer.handleFrame(pipeline.input);
        }
    }
</script>

<div class="canvas">
    <div class="debug">
        {fps.toFixed(0)}
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
        left: 0;
        top: 0;
    }
</style>
