<script lang="ts">
    import type { Snippet } from 'svelte';

    interface Props {
        children: Snippet<[]>;
        duration: number;
    }

    let { children, duration }: Props = $props();

    let targetHeight = $state(0);

    let initialTime = $state(performance.now());
    let currentTime = $state(performance.now());
    let elapsed = $derived(currentTime - initialTime);
    let t = $derived(Math.min(elapsed / duration, 1));

    $effect(() => {
        if (targetHeight) {
            initialTime = performance.now();
        }
    });

    requestAnimationFrame(function update() {
        currentTime = performance.now();
        if (t < 1) {
            requestAnimationFrame(() => update());
        }
    });
</script>

<div class="height-transition" style="--message-height: {targetHeight}px; animation-duration: {duration}ms;">
    <div class="children" bind:clientHeight={targetHeight}>
        {@render children()}
    </div>
</div>

<style lang="scss">
    .height-transition {
        position: relative;
        height: 0;
        width: 100%;
        animation-name: transition;
        animation-timing-function: ease-out;
        animation-fill-mode: forwards;
    }

    @keyframes transition {
        0% {
            height: 0;
        }

        100% {
            height: var(--message-height);
        }
    }

    .children {
        position: absolute;
        height: fit-content;
        width: 100vw;
    }
</style>
