<script lang="ts">
    import { startProgress } from '$lib/tauri';
</script>

<div class="step">
    {#if $startProgress}
        <small>{$startProgress.progress.msg}</small>
    {/if}
</div>

<style lang="scss">
    .step {
        display: flex;
        flex-direction: column;
    }
</style>
