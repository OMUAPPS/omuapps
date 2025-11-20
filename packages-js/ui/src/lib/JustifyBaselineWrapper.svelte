<script lang="ts">
    interface Props {
        children?: import('svelte').Snippet;
    }

    let { children }: Props = $props();
</script>

<div class="wrapper">
    {@render children?.()}
</div>

<style>
    .wrapper {
        display: flex;
        gap: 5px;
        align-items: baseline;
    }
</style>
