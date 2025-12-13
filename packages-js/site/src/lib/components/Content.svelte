<script lang="ts">
    interface Props {
        children?: import('svelte').Snippet;
    }

    let { children }: Props = $props();
</script>

<main>
    {@render children?.()}
</main>

<style>
    main {
        position: relative;
        box-sizing: border-box;
        display: flex;
        flex: 1;
        flex-direction: column;
        width: 100%;
        max-width: 70rem;
        padding: 0 1.5rem;
        font-size: 1em;
    }

    @container (width > 600px) {
        main {
            position: relative;
            left: 24rem;
            right: 20rem;
        }
    }
</style>
