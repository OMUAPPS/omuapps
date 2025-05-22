<script lang="ts">
    import { FileDrop } from '@omujs/ui';
    import { uploadAsset } from '../../game/asset.js';
    import type { Container } from '../../game/behavior/container.js';
    import AssetImage from '../AssetImage.svelte';
    import TransformEdit from '../TransformEdit.svelte';

    export let behavior: Container;
</script>

<div class="behavior">
    <div class="image">
        {#if behavior.overlay}
            {@const asset = behavior.overlay}
            <AssetImage asset={asset} />
        {/if}
    </div>
    <FileDrop handle={async (fileList) => {
        if (fileList.length !== 1) {
            throw new Error('FileDrop must receive only one file');
        }
        behavior.overlay = await uploadAsset(fileList[0]);
    }} accept="image/*">
        {#if behavior.overlay}
            <p>画像を変更</p>
        {:else}
            <p>画像を追加</p>
        {/if}
    </FileDrop>
    <!-- container.overlayTransform -->
    <TransformEdit bind:transform={behavior.overlayTransform} />
</div>

<style lang="scss">
    .behavior {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
</style>
