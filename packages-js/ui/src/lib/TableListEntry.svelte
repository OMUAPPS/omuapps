<script lang="ts">
    import { onDestroy } from 'svelte';

    export let key: string;
    export let selectItem: (key: string | undefined) => void;
    export let transition: boolean = false;

    let element: HTMLElement;

    if (transition) {
        const timeout = window.setTimeout(() => {
            transition = false;
        }, 200);

        onDestroy(() => {
            window.clearTimeout(timeout);
        });
    }
</script>

{#if transition}
    <div class="container" class:transition>
        <div
            bind:this={element}
            role="listitem"
            on:mouseenter={() => selectItem(key)}
            on:mouseleave={() => selectItem(undefined)}
            tabindex="-1"
            class="inner"
        >
            <slot />
        </div>
    </div>
{:else}
    <div
        bind:this={element}
        role="listitem"
        on:mouseenter={() => selectItem(key)}
        on:mouseleave={() => selectItem(undefined)}
        tabindex="-1"
        class="inner"
    >
        <slot />
    </div>
{/if}

<style>
    /* https://zenn.dev/no4_dev/articles/ae1581061bb7b3 */

    .container {
        display: grid;
        grid-template-rows: 1fr;
    }

    .transition {
        animation: slide 0.2s cubic-bezier(0, 0.855, 0.18, 0.925);
    }

    .inner {
        align-self: flex-end;
        overflow: hidden;

        &:focus {
            outline: none;
        }
    }

    @keyframes slide {
        from {
            grid-template-rows: 0fr;
        }

        to {
            grid-template-rows: 1fr;
        }
    }
</style>
