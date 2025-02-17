<script lang="ts">
    import { Theme } from '@omujs/ui';
    import './styles.css';
</script>

<Theme />
<div class="app">
    <slot />
</div>

<style>
    .app {
        position: relative;
        display: flex;
        flex-direction: column;
        height: 100vh;
    }
</style>
