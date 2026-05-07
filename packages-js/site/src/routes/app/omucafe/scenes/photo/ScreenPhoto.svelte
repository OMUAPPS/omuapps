<script lang="ts">
    import Ticker from '$lib/components/Ticker.svelte';
    import { Vec4 } from '$lib/math/vec4';
    import { Timer } from '$lib/timer';
    import { Checkbox, obs, Slider, Tooltip } from '@omujs/ui';
    import { oklch2rgb } from '../../colors';
    import type { Game } from '../../core/game';
    import type { ScenePhotoData } from './photo';
    import Receipt from './Receipt.svelte';

    interface Props {
        game: Game;
        scene: ScenePhotoData;
    }

    let { game, scene = $bindable() }: Props = $props();

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
        scene = { ...scene };
    }

    async function updatePhoto(photo: typeof scene.photo) {
        if (game.side !== 'client') return;
        if (!photo) return;
        if (photo.type === 'started') {
            if (!obsConnected) {
                scene.photo = undefined;
            }
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
                scene = { ...scene };
                return;
            }
            const screenshot = await game.asset.uploadBuffer(binary);
            scene.photo = {
                type: 'completed',
                screenshot,
            };
            scene = { ...scene };
            if (scene.receipt) {
                scene.receipt.screenshot = screenshot;
                game.states.receipts.set(scene.receipt.id, scene.receipt);
            }
        }
    }

    $effect(() => {
        updatePhoto(scene.photo);
    });

    let obsConnected = $state($obs && $obs.isConnected());

    if ($obs) {
        $obs.on('connected', () => {
            obsConnected = true;
        });
        $obs.on('disconnected', () => {
            obsConnected = false;
        });
    }
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
        <div class="tool">
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
            {#if $config.canvas.tool?.type === 'brush'}
                {#snippet color(color: Vec4)}
                    {@const color1 = color.mul({ x: 1 / 255, y: 1 / 255, z: 1 / 255, w: 1 })}
                    <!-- svelte-ignore a11y_consider_explicit_label -->
                    <button
                        class="color"
                        style="background: rgba({color.x}, {color.y}, {color.z}, {color.w});"
                        class:selected={color1.distance($config.canvas.brush.color) < 1 / 255}
                        onclick={() => {
                            $config.canvas.brush.color = color1;
                            $config = { ...$config };
                        }}
                    ></button>
                {/snippet}
                <div class="palette">
                    <div class="col">
                        {@render color(new Vec4(1, 1, 1, 1).mul({ x: 255, y: 255, z: 255, w: 1 }))}
                        {@render color(new Vec4(0.70, 0.70, 0.70, 1).mul({ x: 255, y: 255, z: 255, w: 1 }))}
                        {@render color(new Vec4(0.5, 0.5, 0.5, 1).mul({ x: 255, y: 255, z: 255, w: 1 }))}
                        {@render color(new Vec4(0.25, 0.25, 0.25, 1).mul({ x: 255, y: 255, z: 255, w: 1 }))}
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
                                {@render color(rgb)}
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
            {:else if $config.canvas.tool?.type === 'move'}
                <label>
                    アイテムの大きさ
                    <Slider bind:value={$config.canvas.sacle} min={0.5} max={2.0} step={0.01} clamp={false} />
                </label>
                <label>
                    アイテムの回転
                    <Slider bind:value={$config.canvas.rotation} min={-15} max={15} step={1} />
                </label>
            {/if}
        </div>
        <div class="toggles">
            <label>
                フォトフレーム
                <Checkbox bind:value={$config.photo.frame} />
            </label>
            <label>
                ブルーム
                <Checkbox bind:value={$config.photo.effects.bloom} />
            </label>
            <label>
                フラッシュ
                <Checkbox bind:value={$config.photo.effects.flash} />
            </label>
        </div>
        <div class="actions">
            {#if obsConnected}
                <button class="primary" onclick={takePhoto}>
                    写真を取る
                    <i class="ti ti-camera"></i>
                </button>
            {:else}
                <h3>
                    OBSに接続してください
                </h3>
            {/if}
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
                    const [next] = game.states.orders.values();
                    if (next) {
                        next.startTime = Timer.now();
                    }
                }
                game.canvas.clear();
                game.states.counter.value.items = {};
            }}>
                {#if game.states.orders.size > 1}
                    次の注文へ
                {:else}
                    注文を終える
                {/if}
            </button>
            <button onclick={() => {
                game.states.scene.value = {
                    type: 'photo',
                    pool: scene.pool,
                    receipt: scene.receipt,
                };
            }}>
                撮り直す
            </button>
        </div>
    {/if}
{/snippet}

{#snippet overlayUI()}
    {#if scene.photo}
        {#if scene.photo.type === 'started'}
            <Ticker interval={1000} offset={scene.photo.startTime - Timer.now()}>
                {#snippet children(tick)}
                    {@const remaining = 6 - tick}
                    {#if remaining > 1}
                        <div class="countdown">
                            {remaining}
                        </div>
                        {#if scene.receipt}
                            <div class="receipt">
                                <Receipt receipt={scene.receipt} />
                            </div>
                        {/if}
                    {/if}
                {/snippet}
            </Ticker>
        {:else if scene.photo.type === 'completed'}
            {#await game.asset.getUrl(scene.photo.screenshot).promise then screenshot}
                {#if screenshot.type === 'ready'}
                    <img src={screenshot.data} alt="" class="screenshot">
                {/if}
            {/await}
            {#if scene.receipt}
                <div class="receipt">
                    <Receipt receipt={scene.receipt} animation />
                </div>
            {/if}
            <div class="flash"></div>
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
        padding: 5% 0;
        right: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
    }

    .receipt {
        position: fixed;
        left: 4rem;
        bottom: 28rem;
        filter: drop-shadow(0.25rem 0.5rem 0 rgba(0,0,0,0.5)) drop-shadow(0.25rem 0.5rem 2rem rgba(0,0,0,0.3));
        transform: rotate(10deg) translateY(100%);
        transform-origin: bottom;
    }

    .flash {
        position: fixed;
        inset: 0;
        animation: forwards 0.5s flash;
    }

    @keyframes flash {
        0% {
            background: rgba(255, 255, 255, 1);
        }
        100% {
            background: rgba(255, 255, 255, 0);
        }
    }

    .screenshot {
        position: fixed;
        inset: 0;
        animation: forwards 5s screenshot cubic-bezier(0, 1, 0, 1);

        &::after {
            content: "";
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            box-shadow: inset 0 0 100px rgba(0,0,0,0.5); /* 影の濃さ・範囲 */
        }
    }

    @keyframes screenshot {
        0% {
            transform: rotate(0) scale(1);
        }
        100% {
            transform: rotate(1deg) scale(1.05);
            filter: saturate(1.2) contrast(1.2) sepia(0.4);
        }
    }

    .receipt-client {
        position: fixed;
        left: 2rem;
        bottom: 16rem;
        transform-origin: left bottom;
        transform: translateY(100%);
        scale: 0.75;
        filter: drop-shadow(1px 1px 2px black);
    }

    .tool {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4rem;
        padding: 2rem;
        border-radius: 1rem;
        flex: 1;
        margin-bottom: 2rem;
        background: var(--color-bg-2);
        filter: drop-shadow(1px 1px 0 rgba(0,0,0,0.4));

        .palette {
            display: flex;
            outline: 1px solid var(--color-outline);
            padding: 0.25rem;
            border-radius: 0.25rem;

            > .col {
                display: flex;
                flex-direction: column;
            }
        }

        .color {
            width: 2rem;
            height: 2rem;
            outline: none;
            border: none;

            &.selected {
                animation: forwards color-select 0.0621s;
                outline-offset: 2px;
                border: 3px solid #000;
                z-index: 1;
            }
        }

        .tool-switch {
            background: var(--color-1);
            outline: 1px solid var(--color-1);
            border-radius: 6px;
            padding: 2px;

            > button {
                position: relative;
                width: 10rem;
                height: 2.5rem;
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
    }

    @keyframes color-select {
        0% {
            outline: 2px solid transparent;
            outline-offset: 0px;
        }
        100% {
            outline: 2px solid var(--color-bg-2);
            outline-offset: -1px;
            border-radius: 2px;
        }
    }

    .toggles {
        display: flex;
        gap: 4rem;
        background: var(--color-bg-2);
        color: var(--color-1);
        padding: 1rem 2rem;
        border-radius: 2rem;
        filter: drop-shadow(1px 1px 0 rgba(0,0,0,0.4));
        margin-bottom: 2rem;

        > label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
    }

    .actions {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        filter: drop-shadow(1px 1px 0 rgba(0,0,0,0.4));

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
