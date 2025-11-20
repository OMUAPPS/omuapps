<script lang="ts">
    interface Props {
        children?: import('svelte').Snippet;
    }

    let { children }: Props = $props();
</script>

<div class="menu omu-scroll">
    {@render children?.()}
</div>

<style lang="scss">
    .menu {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 22rem;
        overflow-x: hidden;
        overflow-y: auto;

        > :global(h3) {
            margin-top: 1rem;
            margin-bottom: 0.5rem;
        }

        > :global(:first-child) {
            margin-top: 0;
        }
    }
</style>
