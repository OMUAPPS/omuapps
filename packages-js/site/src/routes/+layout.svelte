<script lang="ts">
    import { Theme } from '@omujs/ui';
    import '@tabler/icons-webfont/dist/tabler-icons.scss';
    import style from 'svelte-highlight/styles/stackoverflow-light';
    import ProgressBar from './_components/ProgressBar.svelte';
    import './styles.css';
    interface Props {
        children?: import('svelte').Snippet;
    }

    let { children }: Props = $props();

    const css = style
        .replace('<style>', '')
        .replace('</style>', '')
        .replace('code.hljs{display:block;overflow-x:auto;padding:1em}', 'code.hljs{display:block;overflow-x:auto;padding:0.5em}');
</script>

<svelte:head>
    <Theme />
</svelte:head>

<svelte:element this={"style"}>
    {css}
</svelte:element>

<div class="app">
    {@render children?.()}
</div>
<ProgressBar />

<style>
    .app {
        position: relative;
        display: flex;
        flex-direction: column;
        height: 100vh;
    }
</style>
