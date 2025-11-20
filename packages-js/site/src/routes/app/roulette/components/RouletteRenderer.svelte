<script lang="ts">
    import { run } from 'svelte/legacy';

    import { BetterMath } from '$lib/math.js';
    import { Timer } from '$lib/timer.js';
    import { onDestroy } from 'svelte';
    import type { RouletteApp } from '../roulette-app.js';

    interface Props {
        roulette: RouletteApp;
    }

    let { roulette }: Props = $props();
    const { rouletteState, entries } = roulette;

    let canvas: HTMLCanvasElement = $state();
    let width: number = $state();
    let height: number = $state();

    function resize() {
        if (!canvas) return;
        width = canvas.clientWidth;
        height = canvas.clientHeight;
        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext('2d');
    }

    function getColor(index: number) {
        const length = Object.keys($entries).length;
        const colors = ['#666', '#444', '#555'];

        if (length % 2 === 0) {
            return colors[index % 2];
        } else {
            return colors[index % 3];
        }
    }

    function deg2rad(deg: number) {
        return ((deg * Math.PI) / 180) % (2 * Math.PI);
    }

    let timer = new Timer();
    let rotateTimer = new Timer();
    let rotation = 0;
    let lastRotation = 0;

    rouletteState.subscribe((value) => {
        if (value.type === 'spin-start') {
            lastRotation = rotation;
            rotateTimer.reset();
        }
    });

    function rouletteEasing(t: number) {
        const a = Math.pow(t, 0.1);
        const r = Math.pow(t, 0.3);
        return BetterMath.lerp(a, 1, r);
    }

    function zoomEasing(t: number) {
        return 1 + BetterMath.lerp(2 / (t + 1), 0, Math.pow(t, 0.5));
    }

    let ctx: CanvasRenderingContext2D | null;

    function render() {
        if (!canvas) return;
        if (!ctx) return;

        const count = Object.keys($entries).length;
        ctx.save();

        let tint = 0;

        if ($rouletteState.type === 'idle' || $rouletteState.type === 'recruiting') {
            const speed = Math.min(1, Math.sqrt(timer.getElapsedMS()) / 100);
            rotation = lastRotation + (timer.getElapsedMS() / 1000 / 20) * speed;
        } else if ($rouletteState.type === 'spinning') {
            const { entry } = $rouletteState.result;
            const index = Object.keys($entries).indexOf(entry.id);
            const offset = 1 / count;
            const hitRotation = index * offset + offset * $rouletteState.random;
            const rotateTo = hitRotation + Math.floor(lastRotation) + 10;
            const time = Date.now() - $rouletteState.start;
            tint = BetterMath.clamp01(1 / ((time / 1000) * 3 + 1));
            const t = rouletteEasing(BetterMath.clamp01(time / $rouletteState.duration));
            rotation = BetterMath.lerp(lastRotation, rotateTo, t);
            const scale = zoomEasing(t);
            ctx.translate(width / 2, height / 2);
            ctx.scale(scale, scale);
            ctx.translate(-width / 2, -height / 2);
        } else if ($rouletteState.type === 'spin-result') {
            const { entry } = $rouletteState.result;
            const index = Object.keys($entries).indexOf(entry.id);
            const offset = 1 / count;
            const hitRotation = index * offset + offset * $rouletteState.random;
            const rotateTo = hitRotation + Math.floor(rotation);
            lastRotation = rotation = rotateTo;
            timer.reset();
        }

        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        const scale = 0.75;
        const scaleFactor = Math.min(width, height) / 1000;
        const t = rotation % 1;
        const angle = deg2rad(t * 360 - 90);
        const radius = (Math.min(width, height) / 2) * scale;
        const split = (2 * Math.PI) / count;

        const hitEntry = Object.entries($entries)[Math.floor(t * count) % count];

        // Draw circle
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, radius, 0, 2 * Math.PI);
        ctx.fill();

        if (count === 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.save();
            const scale = Math.min(width, height) / 300;
            ctx.translate(width / 2, height / 2);
            ctx.scale(scale, scale);
            ctx.translate(-width / 2, -height / 2);
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const text = $rouletteState.type === 'recruiting' ? '募集中' : '';
            ctx.fillStyle = 'black';
            ctx.fillText(text, width / 2, height / 2);
            ctx.restore();
        }

        ctx.translate(width / 2, height / 2);
        ctx.rotate(deg2rad(45 + 45 / 2));
        ctx.translate(-width / 2, -height / 2);

        // Draw texts
        ctx.font = `bold ${0.04 * radius}px "Noto Sans JP"`;
        ctx.textAlign = 'end';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.fillStyle = 'black';

        let i = 0;
        for (const [id, entry] of Object.entries($entries).reverse()) {
            const hit = hitEntry && hitEntry[0] === id;
            const color = getColor(i);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(width / 2, height / 2);
            ctx.arc(width / 2, height / 2, radius, i * split + angle, (i + 1) * split + angle);
            ctx.fill();
            if (hit) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
                ctx.beginPath();
                ctx.moveTo(width / 2, height / 2);
                ctx.arc(width / 2, height / 2, radius, i * split + angle, (i + 1) * split + angle);
                ctx.fill();

                // draw inner outline
                const outlineWidth = 0.04 * radius;
                ctx.strokeStyle = color;
                ctx.lineWidth = outlineWidth;
                ctx.beginPath();
                ctx.arc(
                    width / 2,
                    height / 2,
                    radius - outlineWidth / 2,
                    i * split + angle,
                    (i + 1) * split + angle,
                );
                ctx.stroke();
            }
            ctx.fillStyle = hit ? 'black' : 'white';
            const fontSize = (0.3 * radius) / Math.sqrt(count);
            ctx.font = `bold ${fontSize}px "Noto Sans JP"`;
            const name = entry.name || '';
            const textWidth = ctx.measureText(name).width;
            const textScale = Math.min(1, radius / 1.5 / textWidth);
            ctx.font = `bold ${fontSize * textScale}px "Noto Sans JP"`;
            // draw text
            const x = width / 2 + Math.cos((i + 0.5) * split + angle) * radius * (1 - Math.min(0.1, (1 / Math.sqrt(count)) * 0.5));
            const y = height / 2 + Math.sin((i + 0.5) * split + angle) * radius * (1 - Math.min(0.1, (1 / Math.sqrt(count)) * 0.5));
            // rotate
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate((i + 0.5) * split + angle);
            ctx.fillText(name, 0, 0);
            ctx.restore();

            i++;
        }

        // Draw border
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 10 * scaleFactor;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, radius, 0, 2 * Math.PI);
        ctx.stroke();

        // tint
        if (tint > 0.8) {
            ctx.fillStyle = 'black';
            ctx.globalAlpha = 1;
        } else {
            ctx.fillStyle = 'white';
            ctx.globalAlpha = tint;
        }
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;

        // triangle
        const triangleRadius = radius * 0.1;
        ctx.fillStyle = '#222';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 10 * scaleFactor;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(width / 2 - triangleRadius / 2, height / 2 - radius - triangleRadius);
        ctx.lineTo(width / 2, height / 2 - radius);
        ctx.lineTo(width / 2 + triangleRadius / 2, height / 2 - radius - triangleRadius);
        ctx.stroke();
        ctx.fill();

        ctx.restore();
    }

    let animationFrame: number;

    function loop() {
        render();
        animationFrame = requestAnimationFrame(loop);
    }

    run(() => {
        if (canvas) {
            resize();
            loop();
        }
    });

    onDestroy(() => {
        if (animationFrame) cancelAnimationFrame(animationFrame);
    });
</script>

<svelte:window onresize={resize} />
<canvas bind:this={canvas} bind:clientWidth={width} bind:clientHeight={height}></canvas>

<style lang="scss">
    canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
    }
</style>
