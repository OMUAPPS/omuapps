<script lang="ts">

    interface Props {
        children?: import('svelte').Snippet;
    }

    let { children }: Props = $props();
</script>

<div class="container">
    <div class="content">
        {@render children?.()}
    </div>
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
    }

    .content {
        position: relative;
        box-sizing: border-box;
        display: flex;
        flex: 1;
        flex-direction: column;
        align-items: flex-start;
        width: min(70rem, 100%);
        padding: 0 1.5rem;
        font-size: 1em;
    }
</style>
