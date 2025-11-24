<script lang="ts">
    interface Props {
        name?: string | undefined;
        icon?: string | undefined;
        flex?: number;
        min?: string;
        actions?: import('svelte').Snippet;
        children?: import('svelte').Snippet;
    }

    let {
        name = undefined,
        icon = undefined,
        flex = 0,
        min = '',
        actions,
        children,
    }: Props = $props();
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
