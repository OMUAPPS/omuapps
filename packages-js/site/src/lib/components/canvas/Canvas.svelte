<script lang="ts">
    import { AsyncQueue } from '$lib/queue.js';
    import { onDestroy, onMount } from 'svelte';
    import { Draw } from './draw.js';
    import { GlContext } from './glcontext.js';
    import { Matrices } from './matrices.js';
    import { HTMLInput, type RenderPipeline, type Time } from './pipeline.js';

    interface Props {
        fps?: number;
        render?: (gl: GlContext) => Promise<void> | void;
        render2D?: (context: CanvasRenderingContext2D) => Promise<void> | void;
        setPipeline?: (pipeline: RenderPipeline) => Promise<void>;
        init?: (gl: GlContext) => Promise<void>;
        enter?: (gl: GlContext) => Promise<void> | void;
        leave?: (gl: GlContext) => Promise<void> | void;
        resize?: (gl: GlContext) => void;
    }

    let {
        fps = 60,
        setPipeline = undefined,
        render = () => {},
        render2D = () => {},
        init = async () => {},
        resize = () => {},
    }: Props = $props();

    let canvas: HTMLCanvasElement | undefined = $state(undefined);
    let destroyed: boolean = $state(false);
    const frameQueue = new AsyncQueue<Time>();

    function createPipeline(context: GlContext, canvas: HTMLCanvasElement): RenderPipeline {
        const matrices = new Matrices();
        const draw = new Draw(matrices, context);
        const input = new HTMLInput(canvas);
        let time: Time = { stamp: performance.now(), delta: 0 };

        return {
            context,
            matrices,
            draw,
            input,
            time,
            [Symbol.asyncIterator]: async function*() {
                requestAnimationFrame(async function handle(time) {
                    const delta = time - last;
                    last = time;
                    frameQueue.push({ stamp: time, delta });
                    const interval = 1000 / fps;
                    const delay = interval - delta;
                    if (delay > 0) {
                        await new Promise((r) => setTimeout(r, delay));
                    }
                    requestAnimationFrame(handle);
                });

                let last = performance.now();
                while (!destroyed) {
                    const timestamp = await frameQueue.pop();
                    if (timestamp === null) break;
                    time = timestamp;

                    matrices.width = canvas.clientWidth;
                    matrices.height = canvas.clientHeight;
                    context.gl.canvas.width = canvas.clientWidth;
                    context.gl.canvas.height = canvas.clientHeight;

                    yield { time };
                }
            },
        };
    }

    onMount(async () => {
        if (!canvas) return;
        if (setPipeline) {
            const context = GlContext.create(canvas);
            const pipeline = createPipeline(context, canvas);
            setPipeline(pipeline);
        } else {
            let width = canvas.clientWidth;
            let height = canvas.clientHeight;
            const offscreen = new OffscreenCanvas(width, height);
            const context = GlContext.create(offscreen);
            const target = canvas!.getContext('2d');
            if (!target) {
                throw new Error('Cannot get 2d context from canvas');
            }
            const pipeline = createPipeline(context, canvas);

            await init(context!);

            function handleResize() {
                if (
                    !canvas
                    || !offscreen
                    || !context
                ) return;
                if (
                    width === canvas.clientWidth && height === canvas.clientHeight
                ) return;

                width = canvas.clientWidth;
                height = canvas.clientHeight;
                canvas.width = width;
                canvas.height = height;
                offscreen.width = width;
                offscreen.height = height;
                context.gl.viewport(0, 0, width, height);
                resize(context);
            }

            for await (const frame of pipeline) {
                handleResize();
                await render(context);
                target.clearRect(0, 0, width, height);
                target.drawImage(offscreen, 0, 0);
                await render2D(target);
            }
        }
    });

    onDestroy(() => {
        destroyed = true;
    });
</script>

<svelte:window
    oncontextmenu={(event) => {
        if (event.target !== canvas) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        return false;
    }}
/>
<canvas
    bind:this={canvas}
    oncontextmenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        return false;
    }}
></canvas>

<style lang="scss">
    canvas {
        width: 100%;
        height: 100%;
    }
</style>
