<script lang="ts">
    import { Button, Combobox, FileDrop } from '@omujs/ui';
    import { uploadAssetByFile } from '../../asset/asset.js';
    import AssetImage from '../../components/AssetImage.svelte';
    import TransformEdit from '../../components/TransformEdit.svelte';
    import { createTransform } from '../../game/transform.js';
    import type { Container } from './container.js';

    export let behavior: Container;
</script>

<div class="behavior">
    <label class="setting">
        内容物を範囲内に収める
        <input type="checkbox" value={!!behavior.bounded} on:change={({currentTarget}) => {
            if (!currentTarget.checked) {
                behavior.bounded = undefined;
                return;
            }
            behavior.bounded = { left: true, top: true, right: true, bottom: true}}
        } />
    </label>
    {#if behavior.bounded}
        <label class="setting">
            left
            <input type="checkbox" bind:checked={behavior.bounded.left} />
        </label>
        <label class="setting">
            top
            <input type="checkbox" bind:checked={behavior.bounded.top} />
        </label>
        <label class="setting">
            right
            <input type="checkbox" bind:checked={behavior.bounded.right} />
        </label>
        <label class="setting">
            bottom
            <input type="checkbox" bind:checked={behavior.bounded.bottom} />
        </label>
    {/if}
    <h2>Mask</h2>
    <div class="image">
        {#if behavior.mask}
            {@const asset = behavior.mask.asset}
            <AssetImage asset={asset} />
        {/if}
    </div>
    <div class="actions">
        <FileDrop handle={async (fileList) => {
            if (fileList.length !== 1) {
                throw new Error('FileDrop must receive only one file');
            }
            behavior.mask = {
                asset: await uploadAssetByFile(fileList[0]),
                transform: createTransform(),
            }
        }} accept="image/*">
            {#if behavior.mask}
                <p>画像を変更</p>
            {:else}
                <p>画像を追加</p>
            {/if}
        </FileDrop>
        {#if behavior.mask}
            <Button primary onclick={() => {
                behavior.mask = undefined;
            }}>
                削除
                <i class="ti ti-trash"></i>
            </Button>
        {/if}
    </div>
    {#if behavior.mask}
        <TransformEdit bind:transform={behavior.mask.transform} />
    {/if}
    <h2>Overlay</h2>
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
                asset: await uploadAssetByFile(fileList[0]),
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
    <Combobox options={{
        none: {
            value: null,
            label: '未設定',
        },
        up: {
            value: 'up',
            label: '上に重ねる',
        },
        down: {
            value: 'down',
            label: '下に重ねる',
        },
    }} bind:value={behavior.order} />
</div>

<style lang="scss">
    .behavior {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 100%;
    }

    .image {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 8rem;
        padding: 1rem;
        width: 100%;
        background: var(--color-bg-1);
    }

    .setting {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .actions {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
    }
</style>
