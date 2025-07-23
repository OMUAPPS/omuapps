<script lang="ts">
    import { Button, FileDrop } from '@omujs/ui';
    import { uploadAssetByFile, type Asset } from '../asset/asset.js';
    import AssetImage from './AssetImage.svelte';

    export let image: Asset | null | undefined;
    export let handle: (asset: Asset | undefined) => unknown;
    export let required = false;
</script>

{#if image}
    <div class="image">
        <AssetImage asset={image} />
    </div>
{/if}

<div class="actions">
    <FileDrop primary handle={async (fileList) => {
        if (fileList.length !== 1) {
            throw new Error('FileDrop must receive only one file');
        }
        const file = fileList[0];
        handle(await uploadAssetByFile(file));
    }} accept="image/*">
        {#if image}
            <p>画像を変更</p>
        {:else}
            <p>画像を追加</p>
        {/if}
    </FileDrop>
    {#if image && !required}
        <Button onclick={() => {
            handle(undefined);
        }}>
            削除
            <i class="ti ti-trash"></i>
        </Button>
    {/if}
</div>

<style lang="scss">
    .image {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        width: 100%;
        max-height: 8rem;
        height: 8rem;
        background: var(--color-bg-1);
    }

    .actions {
        margin-top: 0.5rem;
        display: flex;
        justify-content: space-between;
        width: 100%;
    }
</style>
