<script lang="ts">
    interface Props {
        children?: import('svelte').Snippet;
    }

    let { children }: Props = $props();
</script>

<svelte:head>
    <script src="https://www.youtube.com/iframe_api"></script>
    <script src="https://embed.twitch.tv/embed/v1.js"></script>
</svelte:head>

{@render children?.()}
