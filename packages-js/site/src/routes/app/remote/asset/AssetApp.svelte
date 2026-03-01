<script lang="ts">
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import type { RenderPipeline } from '$lib/components/canvas/pipeline.js';
    import { OmuPermissions, type Omu } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import { RemoteApp } from '../remote-app.js';
    import { Renderer } from './renderer.js';

    interface Props {
        omu: Omu;
    }

    let { omu }: Props = $props();
    const remote = new RemoteApp(omu, 'asset');

    if (BROWSER) {
        omu.permissions.require(
            OmuPermissions.ASSET_PERMISSION_ID,
        );
        omu.start();
    }

    const { config, resources } = remote;

    async function setPipeline(pipeline: RenderPipeline) {
        const { context, matrices } = pipeline;
        const renderer = new Renderer(pipeline, omu, () => $config, () => $resources);
        for await (const frame of pipeline) {
            const canvas = context.gl.canvas;
            matrices.projection.orthographic(
                0,
                0,
                canvas.width,
                canvas.height,
                -1,
                1,
            );
            await renderer.render();
        }
    }
</script>

<main>
    <Canvas {setPipeline} />
</main>

<style lang="scss">
    main {
        position: fixed;
        inset: 0;
    }
</style>
