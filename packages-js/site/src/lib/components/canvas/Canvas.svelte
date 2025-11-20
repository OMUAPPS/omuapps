<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { GlContext } from './glcontext.js';

    interface Props {
        canvas?: HTMLCanvasElement | undefined;
        width?: number;
        height?: number;
        fps?: number;
        requestId?: number | null;
        contextMenu?: boolean;
        render?: (gl: GlContext) => Promise<void> | void;
        render2D?: (context: CanvasRenderingContext2D) => Promise<void> | void;
        init?: (gl: GlContext) => Promise<void>;
        enter?: (gl: GlContext) => Promise<void> | void;
        leave?: (gl: GlContext) => Promise<void> | void;
        resize?: (gl: GlContext) => void;
    }

    let {
        canvas = $bindable(undefined),
        width = $bindable(0),
        height = $bindable(0),
        fps = 60,
        requestId = $bindable(null),
        contextMenu = $bindable(false),
        render = () => {},
        render2D = () => {},
        init = async () => {},
        enter = () => {},
        leave = () => {},
        resize = () => {},
    }: Props = $props();
    let glContext: GlContext = $state();

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

    function create() {
        offscreen = new OffscreenCanvas(width, height);
        context = canvas!.getContext('2d');
        glContext = GlContext.create(offscreen);
    }

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
        if (!canvas || !glContext || !context || !offscreen) {
            return;
        }
        resolveFrameBlock();
    }

    onMount(() => {
        if (!canvas) return;
        create();
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
    oncontextmenu={(event) => {
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
    oncontextmenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        contextMenu = true;
        return false;
    }}
    onmouseenter={() => {
        if (glContext) enter(glContext);
    }}
    onmouseleave={() => {
        if (glContext) leave(glContext);
    }}
></canvas>

<style lang="scss">
    canvas {
        width: 100%;
        height: 100%;
    }
</style>
