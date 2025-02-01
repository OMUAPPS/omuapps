<script lang="ts">
    import { FileDrop } from '@omujs/ui';
    import { uploadAsset, type Container } from '../../omucafe-app.js';
    import AssetImage from '../AssetImage.svelte';
    import TransformEdit from '../TransformEdit.svelte';

    export let container: Container;
</script>

<div class="behavior">
    <h3>容器</h3>
    <div class="image">
        {#if container.overlay}
            {@const asset = container.overlay}
            <AssetImage asset={asset} />
        {/if}
    </div>
    <FileDrop handle={async (fileList) => {
        if (fileList.length !== 1) {
            throw new Error('FileDrop must receive only one file');
        }
        container.overlay = await uploadAsset(fileList[0]);
    }} accept="image/*">
        {#if container.overlay}
            <p>画像を変更</p>
        {:else}
            <p>画像を追加</p>
        {/if}
    </FileDrop>
    <!-- container.overlayTransform -->
    <TransformEdit bind:transform={container.overlayTransform} />
</div>

<style lang="scss">
    .behavior {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
</style>
