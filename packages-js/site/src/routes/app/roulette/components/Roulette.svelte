<script lang="ts">
    import { BetterMath } from '$lib/math.js';
    import { Timer } from '$lib/timer.js';
    import type { RouletteApp } from '../roulette-app.js';

    export let roulette: RouletteApp;
    const { state, entries } = roulette;

    let canvas: HTMLCanvasElement;
    let width: number;
    let height: number;

    function resize() {
        if (!canvas) return;
        width = canvas.clientWidth;
        height = canvas.clientHeight;
        canvas.width = width;
        canvas.height = height;
    }

    function getColor(index: number) {
        const hue = (index * 137.508) % 360;
        return `hsla(${hue}, 60%, 70%, 100%)`;
    }

    function deg2rad(deg: number) {
        return ((deg * Math.PI) / 180) % (2 * Math.PI);
    }

    let timer = new Timer();
    let rotateTimer = new Timer();
    let rotation = 0;
    let lastRotation = 0;
    let random = Math.random();

    state.subscribe((value) => {
        if (value.type === 'spin-start') {
            random = BetterMath.invjsrandom();
            lastRotation = rotation;
            rotateTimer.reset();
        }
    });

    function easeInOutCubic(t: number) {
        const y2 = 3 * t * t - 2 * t * t * t;
        const y4 = 1 - Math.pow(2 * (1 - t), 10) / 2;
        if (t <= 0.5) {
            return y2;
        }
        return BetterMath.lerp(y2, y4, 2 * (t - 0.5));
    }

    function render() {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const count = Object.keys($entries).length;
        if (count === 0) return;

        if ($state.type === 'idle') {
            rotation = timer.getElapsedMS() / 1000 / 5;
        } else if ($state.type === 'spinning') {
            const { entry } = $state.result;
            const index = Object.keys($entries).indexOf(entry.id);
            const offset = 1 / count;
            const hitRotation = index * offset + offset * random;
            const rotateTo = hitRotation + Math.floor(lastRotation) + 5;
            const time = Date.now() - $state.start;
            const t = easeInOutCubic(BetterMath.clamp01(time / $state.duration));
            rotation = BetterMath.lerp(lastRotation, rotateTo, t);
        } else if ($state.type === 'spin-result') {
            const { entry } = $state.result;
            const index = Object.keys($entries).indexOf(entry.id);
            const offset = 1 / count;
            const hitRotation = index * offset + offset * random;
            const rotateTo = hitRotation + Math.floor(lastRotation) + 5;
            rotation = rotateTo;
        }

        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        const scale = 0.75;
        const t = rotation % 1;
        const angle = deg2rad(t * 360 - 90);
        const radius = (Math.min(width, height) / 2) * scale;
        const centerRadius = ((Math.min(width, height) * scale) / 2) * 0.25;
        const split = (2 * Math.PI) / count;

        const hitEntry = Object.entries($entries)[Math.floor(t * count) % count];

        // debug
        ctx.fillStyle = 'black';
        ctx.font = 'bold 20px "Noto Sans JP"';
        ctx.textAlign = 'start';
        ctx.textBaseline = 'top';
        ctx.fillText(`${split}`, 0, 0);
        ctx.fillText(`${rotation}`, 0, 20);
        ctx.fillText(`${t * count}`, 0, 40);

        // Draw circle
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, radius, 0, 2 * Math.PI);
        ctx.fill();

        // Draw border
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, radius, 0, 2 * Math.PI);
        ctx.stroke();

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
            }
            ctx.fillStyle = hit ? 'black' : 'white';
            ctx.font = `bold ${(0.3 * radius) / Math.sqrt(count)}px "Noto Sans JP"`;
            // draw text
            const x = width / 2 + Math.cos((i + 0.5) * split + angle) * radius * 0.9;
            const y = height / 2 + Math.sin((i + 0.5) * split + angle) * radius * 0.9;
            // rotate
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate((i + 0.5) * split + angle);
            ctx.fillText(entry.name, 0, 0);
            ctx.restore();

            i++;
        }

        // triangle
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.moveTo(width / 2 - 10, height / 2 - radius - 20);
        ctx.lineTo(width / 2, height / 2 - radius);
        ctx.lineTo(width / 2 + 10, height / 2 - radius - 20);
        ctx.fill();
    }

    let renderHandle: number;

    function loop() {
        render();
        renderHandle = requestAnimationFrame(loop);
    }

    $: {
        if (canvas) {
            resize();
            loop();
        }
    }
</script>

<svelte:window on:resize={resize} />
<canvas bind:this={canvas} bind:clientWidth={width} bind:clientHeight={height} />

<style lang="scss">
    canvas {
        width: 100%;
        height: 100%;
    }
</style>
