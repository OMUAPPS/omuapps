<script lang="ts">
    import type { Omu } from '@omujs/omu';
    import { Identifier } from '@omujs/omu/identifier.js';
    import { onDestroy } from 'svelte';
    import type { ReactionApp } from '../reaction-app.js';
    import { BROWSER } from 'esm-env';

    export let omu: Omu;
    export let reactionApp: ReactionApp;
    let { config, reactionSignal } = reactionApp;

    type Reaction = {
        text: string;
        position: [number, number];
        velocity: [number, number];
        opacity: number;
        rotation: number;
        age: number;
    };

    let reactionArray: Reaction[] = [];
    const spawnQueue: string[] = [];
    const MAX_REACTION_LIMIT = 100;

    reactionSignal.listen((message) => {
        Object.entries(message.reactions).forEach(([text, count]) => {
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
                const assetIdentifier = Identifier.fromKey(assetId);
                const assetUrl = omu.assets.url(assetIdentifier, { noCache: true });
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

        const toSpawnCount = Math.min(Math.floor(elapsedTime / spawnRate), spawnQueue.length);
        for (let i = 0; i < toSpawnCount; i++) {
            spawnReaction(spawnQueue.shift()!);
        }
    }

    function spawnReaction(text: string) {
        const x = Math.random() * (canvas.width - 100);
        const y = Math.random() * (canvas.height - 300) + 300;
        const vx = Math.random() - 0.5;
        const vy = Math.random() - 0.5;

        reactionArray.push({
            text,
            position: [x, y],
            velocity: [vx, vy],
            opacity: 1,
            rotation: 0,
            age: 0,
        });
    }

    function updatePosition() {
        const screenBounds = {
            left: -100,
            top: -100,
            right: canvas.width + 100,
            bottom: canvas.height + 100,
        };

        reactionArray = reactionArray
            .map((reaction) => {
                const [vx, vy] = reaction.velocity;
                const [x, y] = reaction.position;

                let newVx = vx + Math.sin(reaction.age / 15) / 3;
                newVx *= 0.8;
                const newVy = -Math.pow(reaction.age, 0.2);
                const newX = x + newVx;
                const newY = y + newVy;
                const newOpacity =
                    Math.min(1, reaction.age / 10) - Math.max(0, (reaction.age - 50) / 50);
                const newRotation = (Math.sin(reaction.age / 15 + 1) * 5 * Math.PI) / 180;

                return {
                    ...reaction,
                    position: [newX, newY],
                    velocity: [newVx, newVy],
                    opacity: newOpacity,
                    rotation: newRotation,
                    age: reaction.age + 1,
                } satisfies Reaction;
            })
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

    function draw() {
        if (!canvas || !ctx) {
            return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '30px "Noto Color Emoji"';

        reactionArray.forEach(({ text, position, opacity, rotation }) => {
            const [x, y] = position;

            if (opacity <= 0) {
                return;
            }

            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.translate(x, y);
            ctx.rotate(rotation);
            const replacementImage = replaceImages[text];
            if (replacementImage) {
                const height = 50;
                const width = height * (replacementImage.width / replacementImage.height);
                ctx.drawImage(replacementImage, -width / 2, -height / 2, width, height);
            } else {
                ctx.fillText(text, -15, 15);
            }
            ctx.restore();
        });
    }

    let previousTime = Date.now();
    async function waitForDelay() {
        const currentTime = Date.now();
        const timeInterval = 1000 / 30;
        const delay = previousTime + timeInterval - currentTime;
        previousTime = previousTime + timeInterval;

        if (delay > 0) {
            await new Promise<void>((resolve) => setTimeout(resolve, delay));
        }
    }

    if (BROWSER) {
        let animationTimer = requestAnimationFrame(async function drawLoop() {
            await waitForDelay();

            updateSpawn();
            updatePosition();
            draw();
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
<canvas bind:this={canvas} />

<style lang="scss">
    canvas {
        width: 100%;
        height: 100%;
    }

    .hidden {
        font-family: 'Noto Color Emoji';
        font-size: 0;
    }
</style>
