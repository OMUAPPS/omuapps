<script lang="ts">
    import Ticker from '$lib/components/Ticker.svelte';
    import { Vec4 } from '$lib/math/vec4';
    import { Timer } from '$lib/timer';
    import { obs, Slider, Tooltip } from '@omujs/ui';
    import { oklch2rgb } from '../../colors';
    import type { Game } from '../../core/game';
    import type { ScenePhotoData } from './photo';
    import Receipt from './Receipt.svelte';

    interface Props {
        game: Game;
        scene: ScenePhotoData;
    }

    let { game, scene }: Props = $props();
    let config = $derived(game?.states.config.store);

    const TOOLS: ToolEntry[] = [
        {
            name: 'アイテム移動',
            icon: 'ti-hand-stop',
            shortcut: 'T',
            tool: { type: 'move' },
        },
        {
            name: 'ブラシ',
            icon: 'ti-brush',
            shortcut: 'B',
            tool: { type: 'brush' },
        },
        {
            name: '消しゴム',
            icon: 'ti-eraser',
            shortcut: 'E',
            tool: { type: 'eraser' },
        },
    ];

    interface ToolEntry {
        name: string;
        icon: string;
        shortcut: string;
        tool: typeof $config.canvas.tool;
    }

    async function takePhoto() {
        const duration = 5000;
        const startTime = Timer.now();
        scene.photo = {
            type: 'started',
            duration,
            startTime,
        };
    }

    async function updatePhoto(photo: typeof scene.photo) {
        if (game.side !== 'client') return;
        if (!photo) return;
        if (photo.type === 'started') {
            const elapsed = Timer.now() - photo.startTime;
            const remaining = photo.duration - elapsed;
            await new Promise((resolve) => setTimeout(resolve, remaining));
            $obs.screenshotCreate({});
            await new Promise((resolve) => setTimeout(resolve, 1000));
            let binary: Uint8Array | undefined;
            let attempt = 0;
            while (attempt < 10) {
                attempt++;
                const result = await $obs.screenshotGetLastBinary({});
                if (result.data) {
                    binary = result.data;
                    break;
                }
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
            if (!binary) {
                scene.photo = {
                    type: 'failed',
                };
                return;
            }
            const screenshot = await game.asset.uploadBuffer(binary);
            scene.photo = {
                type: 'completed',
                screenshot,
            };
            if (scene.receipt) {
                scene.receipt.screenshot = screenshot;
                game.states.receipts.set(scene.receipt.id, scene.receipt);
            }
        }
    }

    $effect(() => {
        updatePhoto(scene.photo);
    });
</script>

<svelte:window
    onkeydown={(event) => {
        for (const item of TOOLS) {
            if (event.key.toUpperCase() === item.shortcut) {
                $config.canvas.tool = item.tool;
                break;
            }
        }
    }}
    ontouchstart={(event) => {
        event.preventDefault();
    }}
/>

{#snippet clientUI()}
    {#if !scene.photo}
        <div class="tool-switch">
            {#snippet tool({ name, icon, shortcut, tool }: ToolEntry)}
                {@const selected = tool?.type === $config.canvas.tool?.type}
                <button onclick={() => {
                    $config.canvas.tool = tool;
                }} class:selected>
                    <Tooltip>
                        {shortcut}キー
                    </Tooltip>
                    {name}
                    <i class="ti {icon}"></i>
                </button>
            {/snippet}
            {#each TOOLS as item, index (index)}
                {@render tool(item)}
            {/each}
        </div>
        <div class="tool">
            {#if $config.canvas.tool?.type === 'brush'}
                {#snippet color(color: Vec4)}
                    <!-- svelte-ignore a11y_consider_explicit_label -->
                    <button
                        class="color"
                        style="background: rgba({color.x * 255}, {color.y * 255}, {color.z * 255}, {color.w})"
                        class:selected={color.distance($config.canvas.brush.color) < 1 / 255}
                        onclick={() => {
                            $config.canvas.brush.color = color;
                            $config = { ...$config };
                        }}
                    ></button>
                {/snippet}
                <div class="palette">
                    <div class="col">
                        {@render color(new Vec4(1, 1, 1, 1))}
                        {@render color(new Vec4(0.70, 0.70, 0.70, 1))}
                        {@render color(new Vec4(0.5, 0.5, 0.5, 1))}
                        {@render color(new Vec4(0.25, 0.25, 0.25, 1))}
                    </div>
                    {#each Array.from({ length: 10 }).fill(0) as _, hue (hue)}
                        <div class="col">
                            {#each Array.from({ length: 4 }).fill(0) as _, lightness (lightness)}
                                {@const l = [
                                    78,
                                    70,
                                    50,
                                    25,
                                ][lightness]}
                                {@const c = [
                                    10,
                                    20,
                                    20,
                                    30,
                                ][lightness]}
                                {@const h = (1 - hue / 10) * 360}
                                {@const lch = { x: l, y: c, z: h, w: 1 }}
                                {@const rgb = oklch2rgb(lch)}
                                {@render color(rgb.mul({ x: 1 / 255, y: 1 / 255, z: 1 / 255, w: 1 }))}
                            {/each}
                        </div>
                    {/each}
                </div>
                <label>
                    太さ
                    <Slider bind:value={$config.canvas.brush.width} min={1} max={100} step={1} />
                </label>
            {:else if $config.canvas.tool?.type === 'eraser'}
                <label>
                    太さ
                    <Slider bind:value={$config.canvas.eraser.width} min={1} max={100} step={1} />
                </label>
            {/if}
        </div>
        <div class="actions">
            <button class="primary" onclick={takePhoto}>
                写真を取る
                <i class="ti ti-camera"></i>
            </button>
            <button onclick={() => {
                game.startTransition({
                    type: 'kitchen',
                });
            }}>
                キッチンに戻る
                <i class="ti ti-chevron-left"></i>
            </button>
        </div>
        {#if scene.receipt}
            <div class="receipt-client">
                <Receipt receipt={scene.receipt} />
            </div>
        {/if}
    {:else if scene.photo.type === 'started'}
        <div class="countdown">
            <Ticker interval={1000} offset={scene.photo.startTime - Timer.now()}>
                {#snippet children(tick)}
                    {@const remaining = 6 - tick}
                    {#if remaining > 0}
                        {remaining}
                    {/if}
                {/snippet}
            </Ticker>
        </div>
    {:else if scene.photo.type === 'completed'}
        {#if scene.receipt}
            <Receipt receipt={scene.receipt} animation />
        {/if}
        <div class="actions">
            <button class="primary" onclick={() => {
                game.startTransition({
                    type: 'kitchen',
                });
                if (scene.receipt) {
                    game.states.orders.delete(scene.receipt.order.id);
                }
                game.canvas.clear();
            }}>
                次の注文へ
            </button>
            <button onclick={() => {
                game.states.scene.value = {
                    type: 'photo',
                    pool: scene.pool,
                    receipt: scene.receipt,
                };
            }}>
                取り直す
            </button>
        </div>
    {/if}
{/snippet}

{#snippet overlayUI()}
    {#if scene.photo}
        {#if scene.photo.type === 'started'}
            <div class="countdown">
                <Ticker interval={1000} offset={scene.photo.startTime - Timer.now()}>
                    {#snippet children(tick)}
                        {@const remaining = 6 - tick}
                        {#if remaining > 0}
                            {remaining}
                        {/if}
                    {/snippet}
                </Ticker>
            </div>
        {:else if scene.photo.type === 'completed'}
            {#if scene.receipt}
                <div class="receipt">
                    <Receipt receipt={scene.receipt} animation />
                </div>
            {/if}
        {/if}
    {:else}
        {#if scene.receipt}
            <div class="receipt">
                <Receipt receipt={scene.receipt} />
            </div>
        {/if}
    {/if}
{/snippet}

<main>
    {#if game.side === 'client'}
        {@render clientUI()}
    {:else if game.side === 'overlay'}
        {@render overlayUI()}
    {/if}
</main>

<style>
    :global(html) {
        touch-action: none;
    }

    .countdown {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10rem;
        color: var(--color-1);
        text-shadow: 0 0 0.5rem var(--color-bg-2);
    }

    main {
        position: absolute;
        left: 50%;
        bottom: 0;
        top: 0;
        padding: 10% 0;
        right: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
    }

    .receipt {
        position: fixed;
        left: 4rem;
        bottom: 4rem;
        filter: drop-shadow(0.25rem 0.5rem 0 rgba(0,0,0,0.5)) drop-shadow(0.25rem 0.5rem 2rem rgba(0,0,0,0.3));
        transform: rotate(-10deg);
        transform-origin: bottom;
    }

    .receipt-client {
        position: fixed;
        left: 1rem;
        bottom: 1rem;
        transform-origin: left bottom;
        scale: 0.75;
    }

    .tool-switch {
        background: var(--color-1);
        outline: 1px solid var(--color-1);
        border-radius: 8px;
        padding: 4px;

        > button {
            position: relative;
            width: 12rem;
            height: 3rem;
            border: none;
            background: var(--color-1);
            color: var(--color-bg-2);
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            border-radius: 4px;

            &:hover {
                background: color-mix(in srgb, var(--color-1) 90%, var(--color-bg-2) 20%);
            }

            &.selected {
                background: var(--color-bg-2);
                color: var(--color-1);
                outline: 2px solid var(--color-outline);
                font-weight: 700;
            }
        }
    }

    .tool {
        .palette {
            display: flex;
            gap: 2px;
            background: var(--color-bg-1);
            padding: 1rem;
            border-radius: 0.5rem;

            > .col {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
        }

        .color {
            width: 2rem;
            height: 2rem;
            border-radius: 4px;
            outline: none;
            border: none;

            &.selected {
                animation: forwards color-select 0.0621s;
                outline-offset: 2px;
                z-index: 1;
            }
        }
    }

    @keyframes color-select {
        0% {
            outline: 2px solid transparent;
            outline-offset: 1px;
        }
        100% {
            outline: 2px solid var(--color-1);
            outline-offset: 2px;
        }
    }

    .actions {
        display: flex;
        flex-direction: column;
        gap: 1rem;

        > button {
            width: 14rem;
            height: 4rem;
            border: none;
            background: var(--color-bg-2);
            color: var(--color-1);
            outline: 1px solid var(--color-outline);
            font-weight: 700;
            font-size: 1.1rem;
            transform: skewX(-10deg);
            border-radius: 4px;
            cursor: pointer;

            &.primary {
                background: var(--color-1);
                color: var(--color-bg-2);
            }
        }
    }
</style>
