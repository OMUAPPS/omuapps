<script lang="ts">
    import { onDestroy, type Snippet } from 'svelte';

    interface Props {
        interval: number;
        offset: number;
        children: Snippet<[number]>;
    }

    let { interval, offset, children }: Props = $props();

    let tick = $state(0);

    let timeout = 0;
    window.setTimeout(() => {
        tick ++;
        timeout = window.setInterval(() => {
            tick ++;
        }, interval);
    }, offset);

    onDestroy(() => {
        window.clearInterval(timeout);
    });
</script>

{@render children(tick)}

