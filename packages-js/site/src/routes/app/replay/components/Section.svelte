<script lang="ts">
    export let name: string;
    export let icon: string | undefined = undefined;
    export let flex: number | undefined = undefined;
</script>

<div class="section" style:flex>
    <h3>
        {name}
        {#if icon}
            <i class="ti ti-{icon}"></i>
        {/if}
        {@render actions?.()}
    </h3>
    {@render children?.()}
</div>

<style lang="scss">
    h3 {
        text-align: center;
        border-bottom: 1px solid var(--color-1);
        padding-bottom: 0.5rem;
        margin: 0 0.5rem;
    }

    .section {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        background: var(--color-bg-2);
        padding: 1rem 1rem;
    }
</style>
