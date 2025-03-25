<script lang="ts">
    import { type ScreenHandle } from './screen.js';
    import ScreenHeader from './ScreenHeader.svelte';

    export let screen: { handle: ScreenHandle };
    export let title: string;
    export let windowed: boolean = true;
    export let disableDecorations: boolean = false;
    export let disableClose: boolean = false;
    let container: HTMLButtonElement;

    function onClick(event: MouseEvent) {
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
</script>

<svelte:window on:keydown={onKeyPress} />

<button class="container" class:windowed on:click={onClick} bind:this={container}>
    <div class="screen" class:windowed>
        {#if !disableDecorations && windowed}
            <ScreenHeader {title} />
        {/if}
        <div class:windowed class="content" class:no-decorated={disableDecorations}>
            {#if !disableDecorations && !windowed}
                <ScreenHeader {title} />
            {/if}
            <slot />
        </div>
    </div>
</button>

<style lang="scss">
    .container {
        position: absolute;
        inset: 0;
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        appearance: none;
        background: color-mix(in srgb, var(--color-bg-1) 97%, transparent);
        border: none;
    }

    .screen {
        max-width: 100%;
        max-height: 100%;
        animation-fill-mode: forwards;

        &:not(.windowed) {
            width: 100%;
            height: 100%;
        }

        &.windowed {
            animation: menu-in 0.1621s cubic-bezier(0, 1.14, 0, 1);
        }
    }

    .content {
        position: relative;
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        align-items: center;
        overflow: hidden;
        background: var(--color-bg-2);

        &.windowed {
            width: 40rem;
            height: 24rem;
            border: 2px solid var(--color-1);
        }

        &:not(.windowed) {
            position: absolute;
            top: 2.5rem;
            width: 100%;
            height: calc(100% - 2.5rem);

            &:not(.no-decorated) {
                top: 2.5rem;
            }
        }
    }

    @keyframes menu-in {
        0% {
            opacity: 0;
            transform: scale(0);
        }

        86% {
            opacity: 1;
            transform: scale(1.001);
        }

        100% {
            opacity: 1;
            transform: scale(1);
        }
    }
</style>
