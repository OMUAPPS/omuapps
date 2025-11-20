<script>
    import Button from './Button.svelte';
    import Tooltip from './Tooltip.svelte';
</script>

<div>
    <Button>
        <Tooltip>
            きゃっ！
        </Tooltip>
        Click me
        <ti class="ti ti-player-play"></ti>
    </Button>
    <Button onclick={() => new Promise((resolve) => setTimeout(resolve, 1000))}>
        Promise
        <ti class="ti ti-player-play"></ti>
    </Button>

    <Button primary>
        Click me
        <ti class="ti ti-player-play"></ti>
    </Button>
    <Button primary>
        <ti class="ti ti-player-play"></ti>
    </Button>
    <Button primary onclick={() => new Promise((resolve) => setTimeout(resolve, 1000))} >
        {#snippet children({ promise })}
                {#if promise}
                Loading...
            {:else}
                Promise
                <ti class="ti ti-player-play"></ti>
            {/if}
                    {/snippet}
        </Button>
    <Button primary onclick={() => new Promise((_, reject) => setTimeout(reject, 1000))} >
        {#snippet children({ promise })}
                {#if promise}
                {#await promise}
                    Loading...
                {:then}
                    Failed
                    <ti class="ti ti-player-play"></ti>
                {:catch}
                    Failed
                {/await}
            {:else}
                Promise
                <ti class="ti ti-player-play"></ti>
            {/if}
                    {/snippet}
        </Button>
</div>

<style>
    div {
        display: flex;
        gap: 1rem;
    }
</style>
