<script lang="ts">
    import { run } from 'svelte/legacy';

    import { type ScreenHandle } from './screen.js';

    interface Props {
        handle: ScreenHandle;
        windowed?: boolean;
        disableClose?: boolean;
        children?: import('svelte').Snippet;
        info?: import('svelte').Snippet;
    }

    let {
        handle,
        windowed = true,
        disableClose = false,
        children,
        info,
    }: Props = $props();

    let container: HTMLButtonElement | undefined = $state();

    function handleClick(event: MouseEvent) {
        if (disableClose) {
            return;
        }
        if (event.target === container) {
            handle.close();
        }
    }

    function onKeyPress(e: KeyboardEvent) {
        if (disableClose) {
            return;
        }
        if (e.key === 'Escape') {
            handle.close();
        }
    }

    let content: HTMLElement | undefined = $state();

    run(() => {
        if (content) {
            content.focus();
        }
    });
</script>

<svelte:window onkeydown={onKeyPress} />

<button class="container" class:windowed onclick={handleClick} bind:this={container}>
    <div class="content" class:windowed bind:this={content} tabindex="-1">
        {@render children?.()}
    </div>
    <div class="info" class:disableClose>
        {@render info?.()}
    </div>
</button>

<style lang="scss">
    .container {
        position: absolute;
        inset: 0;
        z-index: 100;
        display: flex;
        align-items: stretch;
        appearance: none;
        border: none;
        overflow: hidden;
        background: linear-gradient(
            to right,
            color-mix(in srgb, var(--color-bg-1) 60%, transparent 0%),
            color-mix(in srgb, var(--color-bg-1) 100%, transparent 0%)
        );
    }

    .content {
        width: 24rem;
        margin: 2.5rem 1.5rem;
        background: var(--color-bg-2);
        outline: 1px solid var(--color-outline);
        filter: drop-shadow(0px 4px 0 var(--color-outline));
        border-radius: 0.25rem;
        display: flex;
        flex-direction: column;
        z-index: 10;
        animation: slide forwards 0.1621s;
    }

    .info {
        position: relative;
        flex: 1;
        padding: 4rem max(2rem, 5%);
        overflow-y: auto;
        pointer-events: none;
        overflow: auto;
    }

    .disableClose {
        pointer-events: auto;
    }

    @keyframes slide {
        0% {
            transform: translateX(-10%);
            opacity: 0;
        }
        38% {
            transform: translateX(0.25rem);
            opacity: 0.9;
        }
        100% {
            transform: translateX(0%);
            opacity: 1;
        }
    }
</style>
