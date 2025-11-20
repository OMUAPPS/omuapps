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
            handle.pop();
        }
    }

    function onKeyPress(e: KeyboardEvent) {
        if (disableClose) {
            return;
        }
        if (e.key === 'Escape') {
            handle.pop();
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
        background: color-mix(in srgb, var(--color-bg-1) 97%, transparent);
        border: none;
        top: 2rem;
        overflow: hidden;

        > :global(*) {
            animation: forwards 0.08621s fade;
        }
    }

    .content {
        width: 24rem;
        background: color-mix(in srgb, var(--color-bg-2) 97%, transparent);
        outline: 1px solid var(--color-outline);
        display: flex;
        flex-direction: column;
        animation: forwards 0.08621s slide;
        z-index: 10;
    }

    .info {
        flex: 1;
        padding: max(4rem, 10%) max(2rem, 10%);
        overflow-y: auto;
        pointer-events: none;
        overflow: auto;
    }

    .disableClose {
        pointer-events: auto;
    }

    @keyframes slide {
        0% {
            transform: translateX(-100%);
        }
        20% {
            transform: translateX(-3%);
        }
        98% {
            transform: translateX(0.621%);
        }
        100% {
            transform: translateX(0);
        }
    }

    @keyframes fade {
        0% {
            background: color-mix(in srgb, var(--color-bg-1) 0%, transparent);
            transform: translateX(4px);
        }
        20% {
            background: color-mix(in srgb, var(--color-bg-1) 70%, transparent);
            transform: translateX(3px);
        }
        98% {
            background: color-mix(in srgb, var(--color-bg-1) 90%, transparent);
            transform: translateX(-0.621px);
        }
        100% {
            background: color-mix(in srgb, var(--color-bg-1) 96%, transparent);
            transform: translateX(0);
        }
    }
</style>
