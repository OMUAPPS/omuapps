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
    export let contextMenu: boolean = false;
    export let render: (gl: GlContext) => Promise<void> | void = () => {};
    export let render2D: (context: CanvasRenderingContext2D) => Promise<void> | void = () => {};
    export let init: (gl: GlContext) => Promise<void> = async () => {};
    export let enter: (gl: GlContext) => Promise<void> | void = () => {};
    export let leave: (gl: GlContext) => Promise<void> | void = () => {};
    export let resize: (gl: GlContext) => void = () => {};

    let context: CanvasRenderingContext2D | null = null;
    let offscreen: OffscreenCanvas | null = null;
    let resized = false;

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
            if (resized) {
                handleResize();
                resized = false;
                continue;
            } else if (!canvas || !glContext || !context || !offscreen) {
                continue;
            }
            if (context.isContextLost()) {
                console.warn('Canvas context lost, reinitializing...');
                offscreen = new OffscreenCanvas(width, height);
                context = canvas.getContext('2d');
                glContext = GlContext.create(offscreen);
                resized = true;
                handleResize();
                continue;
            }
            if (offscreen.width === 0 || offscreen.height === 0) {
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
        resolveFrameBlock();
    }

    onMount(() => {
        if (!canvas) return;
        offscreen = new OffscreenCanvas(width, height);
        context = canvas.getContext('2d');
        glContext = GlContext.create(offscreen);
        resized = true;
        handleResize();
        init(glContext).then(() => {
            renderInternal();
            renderLoop();
        });
        const resizeObserver = new ResizeObserver(() => {
            if (!canvas) return;
            width = canvas.clientWidth;
            height = canvas.clientHeight;
            resized = true;
        });
        resizeObserver.observe(canvas);
        return () => resizeObserver.disconnect();
    });

    onDestroy(() => {
        if (requestId) cancelAnimationFrame(requestId);
        if (glContext) glContext.destroy();
    });
</script>

<svelte:window
    on:contextmenu={(event) => {
        if (event.target !== canvas) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        contextMenu = true;
        return false;
    }}
/>
<canvas
    bind:this={canvas}
    bind:clientWidth={canvasWidth}
    bind:clientHeight={canvasHeight}
    on:contextmenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        contextMenu = true;
        return false;
    }}
    on:mouseenter={() => {
        if (glContext) enter(glContext);
    }}
    on:mouseleave={() => {
        if (glContext) leave(glContext);
    }}
></canvas>

<style lang="scss">
    canvas {
        width: 100%;
        height: 100%;
    }
</style>
