<script lang="ts">
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import { Vec2 } from '$lib/math/vec2.js';
    import { context, COUNTER_WIDTH, init, markChanged, render, setContext } from '../game/game.js';
    import { createItemState } from '../game/item-state.js';
    import { getGame } from '../omucafe-app.js';

    const { scene, states, config } = getGame();
    export let side: 'client' | 'overlay' | 'background';

    setContext({
        ...$states.kitchen,
        side: side,
        getConfig: () => $config,
        setConfig: (value) => $config = value,
        getScene: () => $scene,
        setScene: (value) => $scene = value,
        getStates: () => $states,
        setStates: (value) => $states = value,
    })
    $: {
        if (side !== 'client') {
            setContext({
                ...context,
                ...$states.kitchen,
                side,
                getConfig: () => $config,
                setConfig: (value) => $config = value,
            })
        }
    }

    let showDebug = false;
    let openItems: string[] = [];
</script>

<div class="kitchen">
    <div class="canvas">
        <Canvas {init} {render} />
    </div>
    {#if side === 'client'}
        <div class="debug" class:show-debug={showDebug}>
            <h2>
                {JSON.stringify(context).length}
                <button on:click={() => showDebug = !showDebug}>
                    {showDebug ? 'hide' : 'show'}
                </button>
            </h2>
            {#each Object.values(context.items) as item (item.id)}
                <div>
                    <button on:click={() => {
                        openItems = openItems.includes(item.id) ? openItems.filter(id => id !== item.id) : [...openItems, item.id];
                    }}>
                        {item.item.id}
                    </button>
                    {#if openItems.includes(item.id)}
                        <pre>{JSON.stringify(item, null, 2)}</pre>
                    {/if}
                </div>
            {/each}
        </div>
        <div class="ui">
            {#each Object.entries($config.items) as [id, item] (id)}
                <button on:click={() => {
                    const itemState = createItemState(context, {
                        item,
                    });
                    if (!item.behaviors.fixed) {
                        itemState.transform.offset = new Vec2(COUNTER_WIDTH / 3, 200);
                    }
                    markChanged();
                }}>
                    {item.name}
                </button>
            {/each}
            <button on:click={() => {
                for (const id in context.items) {
                    if (id === 'counter') continue;
                    delete context.items[id];
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
        left: 0;
        top: 10rem;
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
