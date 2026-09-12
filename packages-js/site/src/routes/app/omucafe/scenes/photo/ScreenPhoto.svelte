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

    let controlsOpen = $state(true);

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
                scene.photo = { type: 'failed' };
                scene = { ...scene };
                return;
            }
            const elapsed = Timer.now() - photo.startTime;
            const remaining = photo.duration - elapsed;
            await new Promise((resolve) => setTimeout(resolve, remaining));
            await $obs.screenshotCreate({});
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
        updatePhoto(scene.photo).catch((error) => {
            console.error('Failed to take photo', error);
            scene.photo = { type: 'failed' };
            scene = { ...scene };
        });
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
        if (!(event.target instanceof Element && event.target.closest('[data-input]'))) {
            event.preventDefault();
        }
    }}
/>

{#snippet clientUI()}
    <header class="panel-heading">
        <h1>写真を撮る</h1>
    </header>
    {#if !scene.photo}
        <div class="tool">
            <h2>編集ツール</h2>
            <div class="tool-switch">
                {#snippet tool({ name, icon, shortcut, tool }: ToolEntry)}
                    {@const selected = tool?.type === $config.canvas.tool?.type}
                    <button onclick={() => {
                        $config.canvas.tool = tool;
                    }} class:selected aria-pressed={selected}>
                        <Tooltip>
                            {shortcut}キー
                        </Tooltip>
                        {name} <kbd>{shortcut}</kbd>
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

                    <button
                        class="color"
                        aria-label={`色 R${Math.round(color.x)} G${Math.round(color.y)} B${Math.round(color.z)}`}
                        aria-pressed={color1.distance($config.canvas.brush.color) < 1 / 255}
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
            <h2>撮影効果</h2>
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
                    写真を撮る
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
                    {:else}
                        <p class="photo-status" role="status">写真を取得中…</p>
                    {/if}
                {/snippet}
            </Ticker>
        </div>
    {:else if scene.photo.type === 'failed'}
        <div class="actions">
            <p role="alert">写真を取得できませんでした。</p>
            {#if !obsConnected}
                <p>OBSの接続を確認してください。</p>
            {/if}
            <button class="primary" onclick={takePhoto} disabled={!obsConnected}>
                もう一度撮影する
            </button>
            <button onclick={() => game.startTransition({ type: 'kitchen' })}>
                キッチンに戻る
            </button>
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

<main class:collapsed={game.side === 'client' && !controlsOpen && !scene.photo} class:client={game.side === 'client'} data-input={game.side === 'client' ? '' : undefined}>
    {#if game.side === 'client'}
        {#if !scene.photo}
            <button class="toggle-controls" aria-expanded={controlsOpen} onclick={() => (controlsOpen = !controlsOpen)}>
                {controlsOpen ? '操作パネルを隠す' : '撮影の操作を表示'}
                <i class="ti" class:ti-chevron-up={controlsOpen} class:ti-adjustments={!controlsOpen}></i>
            </button>
        {/if}
        {#if controlsOpen || scene.photo}
            {@render clientUI()}
        {/if}
    {:else if game.side === 'overlay'}
        {@render overlayUI()}
    {/if}
</main>

<style>
    .photo-status {
        font-size: 1.25rem;
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
        object-fit: cover;
        transform-origin: center;
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

    main.client {
        box-sizing: border-box;
        left: auto;
        right: 1rem;
        top: 1rem;
        bottom: auto;
        max-height: calc(100% - 2rem);
        width: min(24rem, calc(100% - 2rem));
        padding: 1.25rem;
        align-items: stretch;
        justify-content: flex-start;
        gap: 1.25rem;
        overflow-y: auto;
        background: var(--color-bg-1);
        color: var(--color-text);
        border: 1px solid var(--color-outline);
        border-radius: 0.75rem;
        box-shadow: 0 4px 20px rgb(0 0 0 / 12%);
    }

    main.client.collapsed { width: auto; }

    .toggle-controls {
        flex-shrink: 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        padding: 0.5rem;
        border: none;
        border-radius: 0.25rem;
        background: var(--color-bg-2);
        color: var(--color-1);
        font: inherit;
        cursor: pointer;
    }

    .panel-heading {
        h1 { margin: 0; font-size: 1.5rem; color: var(--color-1); }
        p { margin: 0.5rem 0 0; font-size: 0.875rem; line-height: 1.6; }
    }

    h2 { margin: 0; font-size: 1rem; color: var(--color-1); }

    .tool, .toggles {
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
        border: 1px solid var(--color-outline);
        border-radius: 0.5rem;
        background: var(--color-bg-2);

        label {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 0.5rem;
            font-size: 0.9rem;
        }
    }

    .tool-switch {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.25rem;

        button {
            min-width: 0;
            padding: 0.75rem 0.25rem;
            border: 1px solid var(--color-outline);
            border-radius: 0.4rem;
            background: var(--color-bg-1);
            color: var(--color-text);
            font-size: 0.8rem;
            cursor: pointer;

            &.selected {
                background: var(--color-1);
                color: var(--color-bg-2);
                border-color: var(--color-1);
                font-weight: 700;
            }

            i { display: none; }
        }
    }

    kbd { display: block; margin-top: 0.25rem; font: inherit; opacity: 0.75; }

    .palette {
        display: grid;
        grid-template-columns: repeat(11, minmax(0, 1fr));
        gap: 2px;
        padding: 4px;
        border: 1px solid var(--color-outline);
        border-radius: 0.25rem;
    }

    .col { display: flex; flex-direction: column; gap: 2px; }

    .color {
        width: 100%;
        aspect-ratio: 1;
        padding: 0;
        border: 1px solid rgb(0 0 0 / 15%);
        border-radius: 2px;
        cursor: pointer;

        &.selected { outline: 2px solid var(--color-text); outline-offset: 1px; z-index: 1; }
    }

    .actions {
        position: sticky;
        bottom: -1.25rem;
        flex-shrink: 0;
        margin-top: auto;
        padding: 1rem 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        background: var(--color-bg-1);
        border-top: 1px solid var(--color-outline);

        > button {
            width: 100%;
            min-height: 2.75rem;
            padding: 0.75rem;
            border: 1px solid var(--color-outline);
            border-radius: 0.5rem;
            background: var(--color-bg-2);
            color: var(--color-text);
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;

            &:disabled { opacity: 0.5; cursor: default; }
            &.primary { background: var(--color-1); color: var(--color-bg-2); border-color: var(--color-1); }
        }

        p, h3 { margin: 0; font-size: 0.9rem; line-height: 1.6; }
    }

    button:focus-visible { outline: 2px solid var(--color-1); outline-offset: 3px; }

    @media (max-width: 760px) {
        main.client { right: 0.5rem; top: 0.5rem; bottom: auto; max-height: calc(100% - 1rem); width: min(20rem, calc(100% - 1rem)); padding: 0.75rem; gap: 0.75rem; }
        .tool, .toggles { padding: 0.75rem; }
        .tool-switch { grid-template-columns: 1fr; }
        kbd { display: inline; margin-left: 0.25rem; }
        .actions { bottom: -0.75rem; }
    }
</style>
