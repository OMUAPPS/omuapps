<script lang="ts">
    import Document from '$lib/common/Document.svelte';
    import type { Update } from '@tauri-apps/plugin-updater';

    export let update: Update;
</script>

<div class="hint">
    <Document source={update.body ?? ''} />
</div>

<style lang="scss">
    .hint {
        position: absolute;
        inset: 0;
        padding: 20% 20%;
        padding-top: max(8rem, 12%);
        overflow-y: auto;
        height: 100%;
    }
</style>
