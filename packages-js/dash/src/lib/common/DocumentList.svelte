<script lang="ts">
    interface Props {
        children?: import('svelte').Snippet;
    }

    let { children }: Props = $props();
</script>

<ul>
    {@render children?.()}
</ul>

<style lang="scss">
    ul {
        margin-top: 1.25rem;
        margin-bottom: 1rem;
    }
</style>
