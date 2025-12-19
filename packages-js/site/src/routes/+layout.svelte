<script lang="ts">
    import { PopupPortal, Theme, TooltipPortal } from '@omujs/ui';
    import '@tabler/icons-webfont/dist/tabler-icons.scss';
    import ProgressBar from './_components/ProgressBar.svelte';
    import './styles.css';
    interface Props {
        children?: import('svelte').Snippet;
    }

    let { children }: Props = $props();

</script>

<svelte:head>
    <Theme />
</svelte:head>

<div class="app">
    {@render children?.()}
</div>
<ProgressBar />
<PopupPortal />
<TooltipPortal />

<style>
    .app {
        position: relative;
        display: flex;
        flex-direction: column;
        height: 100vh;
    }
</style>
