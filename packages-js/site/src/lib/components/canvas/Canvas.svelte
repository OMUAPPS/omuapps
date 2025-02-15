<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { GlContext } from './glcontext.js';

    export let glContext: GlContext | undefined = undefined;
    export let canvas: HTMLCanvasElement | undefined = undefined;
    export let canvasWidth: number = 0;
    export let canvasHeight: number = 0;
    export let width: number = 0;
    export let height: number = 0;
    export let fps: number = 60;
    export let requestId: number | null = null;
    export let render: (gl: GlContext) => Promise<void> | void = () => {};
    export let render2D: (context: CanvasRenderingContext2D) => Promise<void> | void = () => {};
    export let init: (gl: GlContext) => Promise<void> = async () => {};
    export let resize: (gl: GlContext) => void = () => {};

    let context: CanvasRenderingContext2D | null = null;
    let offscreen: OffscreenCanvas | null = null;

    function handleResize() {
        if (!canvas || !offscreen || !glContext) return;
        width = canvas.clientWidth;
        height = canvas.clientHeight;
        canvas.width = width;
        canvas.height = height;
        offscreen.width = width;
        offscreen.height = height;
        glContext.gl.viewport(0, 0, width, height);
        resize(glContext);
    }

    let lastTime = performance.now();
    let resolveFrameBlock: () => void = () => {};

    async function renderInternal() {
        while (true) {
            await new Promise<void>((r) => {
                resolveFrameBlock = r;
            });
            if (!canvas || !glContext || !context || !offscreen || offscreen.width === 0 || offscreen.height === 0) {
                continue;
            }
            if (canvas.width !== width || canvas.height !== height) {
                continue;
            }
            await render(glContext);
            context.clearRect(0, 0, width, height);
            context.drawImage(offscreen, 0, 0);
            await render2D(context);
            const currentTime = performance.now();
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;
            const interval = 1000 / fps;
            const delay = interval - deltaTime;
            if (delay > 0) {
                await new Promise((r) => setTimeout(r, delay));
            }
        }
    }

    function renderLoop() {
        requestId = requestAnimationFrame(renderLoop);
        if (!canvas || !glContext || !context || !offscreen || offscreen.width === 0 || offscreen.height === 0) {
            return;
        }
        if (canvas.width !== width || canvas.height !== height) {
            return;
        }
        resolveFrameBlock();
    }

    onMount(() => {
        if (!canvas) return;
        offscreen = new OffscreenCanvas(width, height);
        context = canvas.getContext('2d');
        glContext = GlContext.create(offscreen);
        handleResize();
        init(glContext).then(() => {
            renderInternal();
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
    });
</script>

<canvas bind:this={canvas} bind:clientWidth={canvasWidth} bind:clientHeight={canvasHeight}></canvas>

<style lang="scss">
    canvas {
        width: 100%;
        height: 100%;
    }
</style>
