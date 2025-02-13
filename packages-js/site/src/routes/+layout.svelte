<script lang="ts">
    import { Theme } from '@omujs/ui';
    import '@tabler/icons-webfont/dist/tabler-icons.scss';
    import ProgressBar from './_components/ProgressBar.svelte';
    import './styles.css';
</script>

<Theme />
<div class="app">
    <slot />
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
