<script lang="ts">
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import { Draw } from '$lib/components/canvas/draw.js';
    import { Matrices } from '$lib/components/canvas/matrices.js';
    import { BetterMath } from '$lib/math.js';
    import { Axis } from '$lib/math/axis.js';
    import { Vec4 } from '$lib/math/vec4.js';
    import { Timer } from '$lib/timer.js';
    import { RouletteMechanics } from './roulette-mechanics.js';
    // Import the new logic
    import type { RenderPipeline } from '$lib/components/canvas/pipeline.js';
    import type { RouletteApp } from '../roulette-app.js';
    import type { RouletteItem } from '../state.js';

    interface Props {
        roulette: RouletteApp;
    }

    let { roulette }: Props = $props();
    const { rouletteState, entries } = roulette;

    const timer = new Timer();

    const mechanics = new RouletteMechanics();

    const deg2rad = (deg: number) => ((deg * Math.PI) / 180) % (2 * Math.PI);

    const colors = ['#fff', '#bbb', '#ddd'].map(Vec4.fromColorHex);
    function getColor(index: number, length: number) {
        return length % 2 === 0 ? colors[index % 2] : colors[index % 3];
    }

    let draw: Draw;
    let matrices: Matrices;

    type SpinState = {
        hitEntry?: string;
        radius: number;
        count: number;
    };

    async function setPipeline(pipeline: RenderPipeline) {
        matrices = pipeline.matrices;
        draw = pipeline.draw;

        for await (const frame of pipeline) {
            drawRoulette(pipeline);
        }
    }

    async function drawRoulette(pipeline: RenderPipeline) {
        const { context } = pipeline;
        const { gl } = context;
        const { width, height } = matrices;
        gl.enable(gl.BLEND);
        gl.clearColor(1, 1, 1, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.viewport(0, 0, matrices.width, matrices.height);

        matrices.identity();
        matrices.projection.orthographic(0, 0, width, height, -1, 1);
        matrices.view.translate(width / 2, height / 2, 0);

        const state = $rouletteState;
        const entriesObj = $entries;
        const entryArray = Object.entries(entriesObj);
        const count = entryArray.length;

        // --- Logic Update ---
        let targetId: string | undefined;
        let targetIndex = -1;

        if (state.type === 'spinning' || state.type === 'spin-result') {
            targetId = state.result.id;
            targetIndex = entryArray.findIndex(([id]) => id === targetId);
        }

        // Update the physics/math engine
        mechanics.update(state, count, targetId, targetIndex, timer.getElapsedMS());

        // Apply calculations from mechanics
        const rotation = mechanics.rotation;
        matrices.model.scale(mechanics.scale, mechanics.scale, 1);

        // Example: Use velocity to adjust blur or other visuals (optional)
        // const speedFactor = mechanics.velocity;

        // Calculate visual tint based on spin progress
        let tint = 0;
        if (state.type === 'spinning') {
            const time = Date.now() - state.start;
            tint = BetterMath.clamp01(1 / ((time / 1000) * 3 + 1));
        }

        // --- Drawing Logic (Mostly Unchanged) ---

        const scaleBase = 0.75;
        const scaleFactor = Math.min(width, height) / 1000;
        matrices.view.scale(scaleFactor, scaleFactor, 1);

        const t = rotation % 1;
        const angle = -deg2rad(t * 360 - 90);
        const radius = (Math.min(width, height) / 2) * scaleBase;
        const split = (2 * Math.PI) / Math.max(1, count);

        const hitIndex = count > 0 ? Math.floor(t * count) % count : -1;
        const spin: SpinState = {
            hitEntry: entryArray[hitIndex]?.[0],
            radius,
            count,
        };

        draw.circle(0, 0, 0, radius * 1.0125, { x: 0, y: 0, z: 0, w: 1 });
        draw.circle(0, 0, 0, radius, Vec4.ONE);

        if (count === 0) {
            const count = 5;
            const split = (2 * Math.PI) / Math.max(1, count);
            for (let index = 0; index < count; index++) {
                matrices.model.push();
                matrices.model.rotate(Axis.Z_POS.rotate(index * split + angle - Math.PI));
                await drawEntry({
                    count,
                    radius,
                }, index, { id: '', name: ' ' }, false);
                matrices.model.pop();
            }
            return;
        }

        matrices.model.rotate(Axis.Z_POS.rotateDeg(90));

        for (let index = 0; index < entryArray.length; index++) {
            const [id, entry] = entryArray[index];
            const hit = spin.hitEntry === id;
            matrices.model.push();
            matrices.model.rotate(Axis.Z_POS.rotate(index * split + angle - Math.PI));
            await drawEntry(spin, index, entry, hit);
            matrices.model.pop();
        }

        draw.circle(0, 0, 0, radius / 5, { x: 0.75, y: 0.75, z: 0.75, w: 1 });

        if (tint > 0.75) {
            draw.circle(0, 0, 0, radius, { x: 1, y: 1, z: 1, w: tint });
        }
        drawArrow(radius);

        // Handle timer reset on result
        if (state.type === 'spin-result' && timer.getElapsedMS() > 100) { // arbitrary small buffer
            timer.reset();
        }
    }

    function drawArrow(radius: number) {
        const triangleOffset = radius + radius * (0.15 + Math.sin(timer.getElapsedMS() / 1000 * 5) * 0.01);
        const outline = radius * 0.03;
        draw.triangle(
            { x: -20 - outline, y: -triangleOffset - outline / 2 },
            { x: 0, y: 40 - triangleOffset + outline },
            { x: 20 + outline, y: -triangleOffset - outline / 2 },
            { x: 1, y: 1, z: 1, w: 1 },
        );
        draw.triangle(
            { x: -20, y: -triangleOffset },
            { x: 0, y: 40 - triangleOffset },
            { x: 20, y: -triangleOffset },
            { x: 0, y: 0, z: 0, w: 1 },
        );
    }

    async function drawEntry(spin: SpinState, index: number, entry: RouletteItem, hit: boolean) {
        const scaleFactor = 1 / spin.count;
        draw.circle(0, 0 / 3, 0, spin.radius, hit ? { x: 0.2, y: 0.2, z: 0.2, w: 1 } : getColor(index, spin.count), 0, 0, scaleFactor);
        if (hit) {
            draw.circle(0, 0, spin.radius * 1.05, spin.radius * 1.075, { x: 0, y: 0, z: 0, w: 1 }, 0, 0, scaleFactor);
        }
        matrices.model.rotate(Axis.Z_POS.rotate(scaleFactor * 3));
        matrices.model.translate(spin.radius / 4, 0, 0);
        const scale = Math.min(1, 10 / (spin.count / 1.5 + 4));
        draw.fontWeight = hit ? '900' : '500';
        draw.fontSize = hit ? 46 : 34;
        const entryText = entry.name || `${index}`;
        const bounds = draw.measureTextActual(entryText);
        const fitWidth = (spin.radius / 4 * 2.5) / scale;
        const fitScale = Math.min(fitWidth / bounds.dimensions().x, 1);
        matrices.model.scale(scale * fitScale, scale * fitScale, 1);
        await draw.textAlign(bounds.min.inverse().add({ x: fitWidth / fitScale, y: 0 }), entryText, { x: 1, y: 0.5 }, hit ? Vec4.ONE : { x: 0.2, y: 0.2, z: 0.2, w: 1 });
    }
</script>

<div class="canvas">
    <Canvas {setPipeline} />
</div>

<style lang="scss">
    .canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
</style>
