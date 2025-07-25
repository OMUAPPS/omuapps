<script lang="ts">
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import { Button } from '@omujs/ui';
    import JsonDebugInfo from '../debug/JsonDebugInfo.svelte';
    import { init, mouse, render as renderGame } from '../game/game.js';
    import { createItemState } from '../item/item-state.js';
    import { getGame } from '../omucafe-app.js';
    import MenuRenderer from '../product/MenuRenderer.svelte';

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
                        createItemState({
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
    {:else if side === 'overlay'}
        <div class="menu" class:active={$scene.type === 'kitchen' || $scene.type === 'main_menu'}>
            <MenuRenderer />
        </div>
        {#if $states.kitchen.lastOrder && $states.kitchen.order}
            {@const order = $states.kitchen.lastOrder}
            {#key $states.kitchen.lastOrder.id}
                <div class="last-order">
                    {order.user.name} - {order.index + 1}番目
                </div>
            {/key}
        {/if}
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

    .menu {
        position: absolute;
        left: 5rem;
        top: 2rem;
        visibility: hidden;

        &.active {
            animation: fadeIn forwards 0.1621s ease-in-out;
        }
    }

    @keyframes fadeIn {
        0% {
            opacity: 0;
            transform: translateY(-10rem);
        }

        80% {
            transform: translateY(1rem);
            rotate: 1deg;
        }

        100% {
            opacity: 1;
            visibility: visible;
        }
    }

    .last-order {
        position: absolute;
        right: 2rem;
        bottom: 4rem;
        font-size: 2rem;
        color: var(--color-1);
        border-bottom: 2px solid var(--color-1);
        animation: fadeOut forwards 5.1621s ease-in-out;
    }

    @keyframes fadeOut {
        0% {
            opacity: 1;
            transform: translateX(8rem) scaleY(0);
        }

        3% {
            opacity: 1;
            transform: translateX(-1rem) scaleY(1.1);
        }

        5% {
            opacity: 1;
            transform: translateX(0) scaleY(1) rotate(-1deg);
        }

        98% {
            opacity: 1;
            transform: translateX(0);
        }

        100% {
            opacity: 0;
            transform: translateX(10rem);
        }
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
