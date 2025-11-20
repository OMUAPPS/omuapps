<script lang="ts">
    interface Props {
        children?: import('svelte').Snippet;
    }

    let { children }: Props = $props();
</script>

<blockquote>
    {@render children?.()}
</blockquote>

<style lang="scss">
    blockquote {
        // background: var(--color-bg-1);
        border-left: 4px solid var(--color-1);
        outline: 2px solid var(--color-1);
        padding-left: 1rem;
        margin: 1rem 0;
        padding: 1rem 1rem;
        padding-right: 4rem;
        padding-top: 0;
        white-space: pre-wrap;
    }
</style>
