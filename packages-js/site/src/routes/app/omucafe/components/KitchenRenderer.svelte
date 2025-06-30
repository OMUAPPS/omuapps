<script lang="ts">
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import { Button } from '@omujs/ui';
    import JsonDebugInfo from '../debug/JsonDebugInfo.svelte';
    import { getContext, init, mouse, render as renderGame } from '../game/game.js';
    import { createItemState } from '../item/item-state.js';
    import { getGame } from '../omucafe-app.js';

    const { config, gameConfig, states, scene, paintEvents } = getGame();
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
                mouse.ui = false;
            }}
            leave={() => {
                mouse.over = false;
            }}
        />
    </div>
    {#if side === 'client'}
        <div class="debug">
            <h2>
                <button on:click={() => showDebug = !showDebug}>
                    {showDebug ? 'hide' : 'show'}
                </button>
            </h2>
            {#if showDebug}
                {#each Object.entries($gameConfig.items) as [key, item] (key)}
                    <Button onclick={() => {
                        const ctx = getContext();
                        createItemState(ctx, {
                            item,
                        })
                    }}>
                        {item.name}
                    </Button>
                {/each}
                states: {JSON.stringify($states).length}
                <JsonDebugInfo value={$states} />
                <h2>
                    paintEvents: {JSON.stringify($paintEvents).length}
                </h2>
                <JsonDebugInfo value={$paintEvents} />
                <h2>
                    scene: {JSON.stringify($scene).length}
                </h2>
                <JsonDebugInfo value={$scene} />
                <h2>
                    gameConfig: {JSON.stringify($gameConfig).length}
                </h2>
                <JsonDebugInfo value={$gameConfig} />
                <h2>
                    config: {JSON.stringify($config).length}
                </h2>
                <JsonDebugInfo value={$config} />
            {/if}
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
        max-height: 40rem;
        cursor: initial;
    }

    button {
        padding: 0.5rem;
        background: white;
        border: 1px solid black;
        cursor: pointer;
    }
</style>
