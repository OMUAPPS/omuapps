<script lang="ts">
    import Document from '$lib/common/Document.svelte';
    import agreements from '../agreements.md?raw';
</script>

<div class="agreements">
    <Document source={agreements} />
</div>

<style lang="scss">
    .agreements {
        position: absolute;
        inset: 0;
        padding: max(4rem, 10%) max(2rem, 10%);
        overflow-y: auto;
    }
</style>
