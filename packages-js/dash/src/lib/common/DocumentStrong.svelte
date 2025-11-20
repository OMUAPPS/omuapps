<script lang="ts">
    interface Props {
        children?: import('svelte').Snippet;
    }

    let { children }: Props = $props();
</script>

<strong>
    {@render children?.()}
</strong>

<style lang="scss">
    strong {
        color: var(--color-1);
        margin: 0 0.25rem;
        font-weight: 600;
    }
</style>
