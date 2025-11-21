<script lang="ts">

    interface Props {
        end: number;
        children?: import('svelte').Snippet;
    }

    let { end, children }: Props = $props();

    let now = $state(Date.now());
    let seconds = $derived(Math.floor((end - now) / 1000) % 60);
    let minutes = $derived(Math.floor((end - now) / 1000 / 60) % 60);
    let hours = $derived(Math.floor((end - now) / 1000 / 60 / 60));

    let timeout: number | undefined = $state(undefined);

    function update(end: number) {
        now = Date.now();
        seconds = Math.floor((end - now) / 1000) % 60;
        minutes = Math.floor((end - now) / 1000 / 60) % 60;
        hours = Math.floor((end - now) / 1000 / 60 / 60);
        if (now < end) {
            const remaining = end - now;
            timeout = window.setTimeout(update, remaining % 1000, end);
        }
    }

    $effect(() => {
        update(end);

        return () => {
            clearTimeout(timeout);
        };
    });
</script>

<div class="timer">
    {#if now >= end}
        {@render children?.()}
    {:else}
        <h1>{hours}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</h1>
    {/if}
</div>
