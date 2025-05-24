<script lang="ts">
    import { Button, FileDrop } from '@omujs/ui';
    import { uploadAsset } from '../../game/asset.js';
    import type { Container } from '../../game/behavior/container.js';
    import { createTransform } from '../../game/transform.js';
    import AssetImage from '../AssetImage.svelte';
    import TransformEdit from '../TransformEdit.svelte';

    export let behavior: Container;
</script>

<div class="behavior">
    <div class="image">
        {#if behavior.overlay}
            {@const asset = behavior.overlay}
            <AssetImage asset={asset.asset} />
        {/if}
    </div>
    <div class="actions">
        <FileDrop handle={async (fileList) => {
            if (fileList.length !== 1) {
                throw new Error('FileDrop must receive only one file');
            }
            behavior.overlay = {
                asset: await uploadAsset(fileList[0]),
                transform: createTransform(),
            }
        }} accept="image/*">
            {#if behavior.overlay}
                <p>画像を変更</p>
            {:else}
                <p>画像を追加</p>
            {/if}
        </FileDrop>
        {#if behavior.overlay}
            <Button primary onclick={() => {
                behavior.overlay = undefined;
            }}>
                削除
                <i class="ti ti-trash"></i>
            </Button>
        {/if}
    </div>
    {#if behavior.overlay}
        <TransformEdit bind:transform={behavior.overlay.transform} />
    {/if}
</div>

<style lang="scss">
    .behavior {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .actions {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
    }
</style>
