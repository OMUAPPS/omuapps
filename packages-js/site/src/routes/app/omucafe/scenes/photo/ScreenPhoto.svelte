<script lang="ts">
    import { Vec4 } from '$lib/math/vec4';
    import { Slider, Tooltip } from '@omujs/ui';
    import { oklch2rgb } from '../../colors';
    import type { Game } from '../../core/game';
    import type { ScenePhotoData } from './photo';

    interface Props {
        game: Game;
        scene: ScenePhotoData;
    }

    let { game }: Props = $props();
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
    <button onclick={() => {
        game.canvas.clear();
    }}>
        reset
    </button>
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
        <button class="primary">
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
{/snippet}

<main>
    {#if game.side === 'client'}
        {@render clientUI()}
    {/if}
</main>

<style>
    :global(html) {
        touch-action: none;
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
