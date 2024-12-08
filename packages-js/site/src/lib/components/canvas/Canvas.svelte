<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { GlContext } from './glcontext.js';

    export let glContext: GlContext | undefined = undefined;
    export let canvas: HTMLCanvasElement | undefined = undefined;
    export let width: number = 0;
    export let height: number = 0;
    export let fps: number = 60;
    export let requestId: number | null = null;
    export let render: (gl: GlContext) => Promise<void>;
    export let init: (gl: GlContext) => Promise<void>;
    export let resize: (gl: GlContext) => void = () => {};

    function handleResize() {
        if (!canvas) return;
        if (!glContext) return;
        canvas.width = width;
        canvas.height = height;
        glContext.gl.viewport(0, 0, width, height);
        resize(glContext);
    }

    let lastTime = performance.now();
    let timeout: number | null = null;

    async function renderLoop() {
        if (!glContext) return;
        await render(glContext);
        const currentTime = performance.now();
        const interval = 1000 / fps;
        const elapsed = currentTime - lastTime;
        const delay = Math.max(interval - elapsed, 0);
        lastTime = currentTime + delay;
        if (delay > 0) await new Promise(resolve => (timeout = window.setTimeout(resolve, delay)));
        requestId = requestAnimationFrame(renderLoop);
    }

    onMount(() => {
        if (!canvas) return;
        glContext = GlContext.create(canvas);
        handleResize();
        init(glContext).then(() => {
            renderLoop();
        });
        const resizeObserver = new ResizeObserver(() => {
            if (!canvas) return;
            width = canvas.clientWidth;
            height = canvas.clientHeight;
            handleResize();
        });
        resizeObserver.observe(canvas);
        return () => resizeObserver.disconnect();
    });

    onDestroy(() => {
        if (requestId) cancelAnimationFrame(requestId);
        if (glContext) glContext.destroy();
        if (timeout) clearTimeout(timeout);
    })
</script>

<canvas bind:this={canvas} bind:clientWidth={width} bind:clientHeight={height} />

<style lang="scss">
    canvas {
        width: 100%;
        height: 100%;
    }
</style>
