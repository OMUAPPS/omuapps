<script lang="ts">
    export let end: number;

    let now = Date.now();
    let seconds = Math.floor((end - now) / 1000) % 60;
    let minutes = Math.floor((end - now) / 1000 / 60) % 60;
    let hours = Math.floor((end - now) / 1000 / 60 / 60);

    let timeout: number;

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

    $: {
        clearTimeout(timeout);
        update(end);
    }
</script>

<div class="timer">
    {#if now >= end}
        <slot />
    {:else}
        <h1>{hours}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</h1>
    {/if}
</div>
