<script lang="ts">
    import { comparator } from '$lib/helper.js';
    import { lerp } from '$lib/math/math.js';
    import { Timer } from '$lib/timer.js';
    import type { Omu } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import { onDestroy } from 'svelte';
    import { ReactionApp } from '../reaction-app.js';

    export let omu: Omu;
    export let reactionApp: ReactionApp;
    let { config, reactionSignal } = reactionApp;

    type Reaction = {
        text: string;
        position: [number, number];
        velocity: [number, number];
        depth: number;
        opacity: number;
        rotation: number;
        age: number;
    };

    let reactionArray: Reaction[] = [];
    const spawnQueue: string[] = [];
    const MAX_REACTION_LIMIT = 100;

    reactionSignal.listen((reaction) => {
        Object.entries(reaction.reactions).forEach(([text, count]) => {
            for (let i = 0; i < count; i++) {
                spawnQueue.push(text);
            }
            if (spawnQueue.length > MAX_REACTION_LIMIT) {
                spawnQueue.splice(0, spawnQueue.length - MAX_REACTION_LIMIT);
            }
        });
    });

    let replaceImages: Record<string, HTMLImageElement | null> = {};
    config.subscribe((config) => {
        const replaces = config.replaces;
        replaceImages = Object.fromEntries(
            Object.entries(replaces).map(([key, assetId]) => {
                if (!assetId) {
                    return [key, null];
                }
                const assetUrl = omu.assets.url(assetId, { cache: 'no-cache' });
                const img = new Image();
                img.src = assetUrl;
                return [key, img];
            }),
        );
    });

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    $: if (canvas) {
        resize();
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to get 2d context');
        }
        ctx = context;
    }

    function resize() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }

    function getSpawnRate() {
        if (spawnQueue.length === 0) {
            return 0.1;
        }
        return Math.min(10, 1 / spawnQueue.length);
    }

    let prevSpawnTime = Date.now();

    function updateSpawn() {
        const currentTime = Date.now();
        const elapsedTime = (currentTime - prevSpawnTime) / 1000;
        const spawnRate = getSpawnRate();

        if (elapsedTime < spawnRate) {
            return;
        }

        prevSpawnTime = currentTime;

        const toSpawnCount = Math.min(
            Math.floor(elapsedTime / spawnRate),
            spawnQueue.length,
        );
        for (let i = 0; i < toSpawnCount; i++) {
            spawnReaction(spawnQueue.shift()!);
        }
    }

    $: reactionScale = 50 * $config.scale;

    function spawnReaction(text: string) {
        const x = lerp(
            reactionScale,
            canvas.width - reactionScale - 50,
            Math.random(),
        );
        const y = lerp(
            reactionScale + 300,
            canvas.height - reactionScale,
            Math.random(),
        );
        const z = lerp(1 - ($config.depth || 0), 1, Math.random());
        const vx = Math.random() - 0.5;
        const vy = Math.random() - 0.5;

        const reaction = {
            text,
            position: [x, y],
            velocity: [vx, vy],
            depth: z,
            opacity: 1,
            rotation: 0,
            age: 0,
        } satisfies Reaction;
        reactionArray.push(updateReaction(reaction));
    }

    function updateReaction(reaction: Reaction) {
        const [vx] = reaction.velocity;
        const [x, y] = reaction.position;

        let newVx = vx + Math.sin(reaction.age / 15) / 3;
        newVx *= 0.8;
        const newVy = -Math.pow(reaction.age, 0.2);
        const newX = x + newVx * reaction.depth;
        const newY = y + newVy * reaction.depth;
        const newOpacity =
            Math.min(1, reaction.age / 10) -
                Math.max(0, (reaction.age - 50) / 50);
        const newRotation =
            (Math.sin(reaction.age / 15 + 1) * 5 * Math.PI) / 180;

        return {
            ...reaction,
            position: [newX, newY],
            velocity: [newVx, newVy],
            opacity: newOpacity,
            rotation: newRotation,
            age: reaction.age + 1,
        } satisfies Reaction;
    }

    function updatePosition() {
        const screenBounds = {
            left: -reactionScale,
            top: -reactionScale,
            right: canvas.width + reactionScale,
            bottom: canvas.height + reactionScale,
        };

        reactionArray = reactionArray
            .map((reaction) => updateReaction(reaction))
            .filter(({ position }) => {
                const [x, y] = position;
                return (
                    x >= screenBounds.left &&
                    x <= screenBounds.right &&
                    y >= screenBounds.top &&
                    y <= screenBounds.bottom
                );
            });
    }

    function renderReactions() {
        if (!canvas || !ctx) {
            return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const {
            text,
            position,
            depth,
            opacity,
            rotation,
        } of reactionArray.sort(comparator((reaction) => reaction.depth))) {
            const [x, y] = position;

            if (opacity <= 0) {
                continue;
            }

            ctx.font = `${30 * $config.scale * depth}px "Noto Color Emoji"`;

            ctx.save();
            ctx.globalAlpha = opacity * depth;
            ctx.translate(x, y);
            ctx.rotate(rotation);
            const replacementImage = replaceImages[text];
            if (replacementImage) {
                const height = 50 * $config.scale * depth;
                const width =
                    (replacementImage.width / replacementImage.height) * height;
                ctx.drawImage(
                    replacementImage,
                    -width / 2,
                    -height / 2,
                    width,
                    height,
                );
            } else {
                const centerX = ctx.measureText(text).width / 2;
                ctx.fillText(text, -centerX, 0);
            }
            ctx.restore();
        }
    }

    const timer = new Timer();

    if (BROWSER) {
        let animationTimer = requestAnimationFrame(async function drawLoop() {
            updateSpawn();
            for (let i = 0, ticks = timer.tick(33); i < ticks; i++) {
                updatePosition();
            }
            renderReactions();
            animationTimer = requestAnimationFrame(drawLoop);
        });

        onDestroy(() => {
            cancelAnimationFrame(animationTimer);
        });
    }
</script>

<div class="hidden">
    <!-- canvas内だとフォントが読み込まれないので、ここで読み込む -->
    😳😄❤🎉💯
</div>

<svelte:window on:resize={resize} />
<canvas bind:this={canvas}></canvas>

<style lang="scss">
    canvas {
        width: 100%;
        height: 100%;
    }

    .hidden {
        font-family: "Noto Color Emoji";
        font-size: 0;
    }
</style>
