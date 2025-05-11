<script lang="ts">
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import { getContext, init, markChanged, mouse, render as renderGame } from '../game/game.js';
    import { createItemState, removeItemState } from '../game/item-state.js';
    import { getGame } from '../omucafe-app.js';
    import ItemDebugInfo from './debug/ItemDebugInfo.svelte';
    import JsonDebugInfo from './debug/JsonDebugInfo.svelte';

    const { gameConfig: config } = getGame();
    export let side: 'client' | 'overlay' | 'background';
    let showDebug = false;
</script>

<div class="kitchen">
    <div class="canvas">
        <Canvas
            {init}
            render={renderGame}
            enter={() => {
                mouse.over = true;
            }}
            leave={() => {
                mouse.over = false;
            }}
        />
    </div>
    {#if side === 'client'}
        <div class="debug" class:show-debug={showDebug}>
            <h2>
                {JSON.stringify(getContext().states).length}
                <button on:click={() => showDebug = !showDebug}>
                    {showDebug ? 'hide' : 'show'}
                </button>
            </h2>
            <JsonDebugInfo value={getContext()} />
            {#each Object.values(getContext().items) as item (item.id)}
                <ItemDebugInfo {item} />
            {/each}
        </div>
        <div class="ui">
            {#each Object.entries($config.items) as [id, item] (id)}
                <button on:click={() => {
                    createItemState(getContext(), {
                        item,
                    });
                    markChanged();
                }}>
                    {item.name}
                </button>
            {/each}
            <button on:click={() => {
                for (const id in getContext().items) {
                    if (id === 'counter') continue;
                    if (id === 'bell') continue;
                    const item = getContext().items[id];
                    if (!item) continue;
                    removeItemState(item);
                }
                markChanged();
            }}>
                全部消す
            </button>
        </div>
    {/if}
</div>

<style lang="scss">
    .kitchen {
        position: absolute;
        inset: 0;
        overflow: hidden;
    }

    .canvas {
        position: absolute;
        inset: 0;
        cursor: none;
    }

    .debug {
        position: absolute;
        right: 1rem;
        top: 1rem;
        padding: 1rem;
        overflow-y: auto;
        z-index: 1;
        background: var(--color-bg-2);
        height: 4rem;

        &.show-debug {
            height: 70%;
        }
    }

    .ui {
        position: absolute;
        bottom: 0;
        right: 0;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        padding: 0.5rem;
        background: rgba(255, 255, 255, 0.5);
        z-index: 1;
    }

    button {
        padding: 0.5rem;
        background: white;
        border: 1px solid black;
        cursor: pointer;
    }
</style>
