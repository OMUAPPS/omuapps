<script lang="ts">
    import { type ScreenHandle } from './screen.js';

    export let screen: { handle: ScreenHandle };
    export let windowed: boolean = true;
    export let disableClose: boolean = false;
    let container: HTMLButtonElement;

    function handleClick(event: MouseEvent) {
        if (disableClose) {
            return;
        }
        if (event.target === container) {
            screen.handle.pop();
        }
    }

    function onKeyPress(e: KeyboardEvent) {
        if (disableClose) {
            return;
        }
        if (e.key === 'Escape') {
            screen.handle.pop();
        }
    }

    let content: HTMLElement | undefined;

    $: {
        if (content) {
            content.focus();
        }
    }
</script>

<svelte:window on:keydown={onKeyPress} />

<button class="container" class:windowed on:click={handleClick} bind:this={container}>
    <div class="content" class:windowed bind:this={content} tabindex="-1">
        <slot />
    </div>
    <div class="info" class:disableClose>
        <slot name="info" />
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
        display: flex;
        flex-direction: column;
        animation: forwards 0.08621s slide;
    }

    .info {
        flex: 1;
        padding: max(4rem, 10%) max(2rem, 10%);
        outline: 1px solid var(--color-outline);
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
