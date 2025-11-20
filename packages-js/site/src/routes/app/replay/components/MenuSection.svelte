<script lang="ts">
    export let name: string | undefined = undefined;
    export let icon: string | undefined = undefined;
    export let flex: number = 0;
    export let min: string = '';
</script>

{#if name || icon}
    <h3>
        {#if name}
            {name}
        {/if}
        {#if icon}
            <i class="ti {icon}"></i>
        {/if}
        {@render actions?.()}
    </h3>
{/if}
<section style:flex style:min-height={min}>
    {@render children?.()}
</section>

<style lang="scss">
    h3 {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        white-space: nowrap;
        font-size: 1rem;
    }
</style>
