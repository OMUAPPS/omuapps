<script lang="ts">
    import type { Snippet } from 'svelte';

    interface Props {
        children?: Snippet<[]>;
    }

    let { children }: Props = $props();
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
    <link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic&display=swap" rel="stylesheet">
</svelte:head>

{@render children?.()}
