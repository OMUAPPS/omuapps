<script lang="ts">
    import { FileDrop } from '@omujs/ui';
    import { getAssetImage, uploadAsset } from '../game/asset.js';
    import { createContainer } from '../game/behavior/container.js';
    import { createFixed } from '../game/behavior/fixed.js';
    import type { Item } from '../game/item.js';
    import AssetImage from './AssetImage.svelte';
    import ContainerEdit from './behavior/ContainerEdit.svelte';
    import FixedEdit from './behavior/FixedEdit.svelte';
    import TransformEdit from './TransformEdit.svelte';

    export let item: Item;
</script>

<main>
    <div class="info">
        <h3>商品詳細</h3>
        <div class="image" class:no-image={!item.image}>
            {#if item.image}
                {@const asset = item.image}
                <AssetImage asset={asset} />
            {/if}
        </div>
        <FileDrop handle={async (fileList) => {
            if (fileList.length !== 1) {
                throw new Error('FileDrop must receive only one file');
            }
            item.image = await uploadAsset(fileList[0]);
            const image = await getAssetImage(item.image);
            item.bounds = {
                min: { x: 0, y: 0 },
                max: { x: image.width, y: image.height },
            }
        }} accept="image/*">
            {#if item.image}
                <p>画像を変更</p>
            {:else}
                <p>画像を追加</p>
            {/if}
        </FileDrop>
        <label>
            商品名
            <input type="text" bind:value={item.name} />
        </label>
        <TransformEdit bind:transform={item.transform} />
        <code>
            {JSON.stringify(item, null, 2)}
        </code>
    </div>
    <div class="behavior-info">
        {#if item.behaviors.container}
            <ContainerEdit bind:container={item.behaviors.container} />createContainer
            <button on:click={() => {
                item.behaviors.container = undefined;
            }}>
                容器を削除
            </button>
        {:else}
            <button on:click={() => {
                item.behaviors.container = createContainer();
            }}>
                容器を設定
            </button>
        {/if}
        {#if item.behaviors.fixed}
            <FixedEdit bind:fixed={item.behaviors.fixed} />
            <button on:click={() => {
                item.behaviors.fixed = undefined;
            }}>
                固定を削除
            </button>
        {:else}
            <button on:click={() => {
                item.behaviors.fixed = createFixed({});
            }}>
                固定を設定
            </button>
        {/if}
    </div>
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        color: var(--color-1);
        display: flex;
        justify-content: space-between;
        gap: 1rem;
    }

    .info {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 20rem;
        height: 100%;
        padding: 1rem;
        outline: 1px solid var(--color-outline);
        background: var(--color-bg-2);
        box-shadow: 2px 0px 1px rgba($color: #000000, $alpha: 0.0621);
        overflow-y: auto;

        > label {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
    }

    h3 {
        border-bottom: 1px solid var(--color-1);
        padding-bottom: 0.25rem;
        margin-bottom: 1rem;
    }

    input {
        padding: 0.5rem;
        border: 1px solid var(--color-outline);

        &:focus {
            outline: none;
            border-color: var(--color-1);
        }
    }

    .image {
        width: 100%;
        height: 10rem;
        display: flex;
        align-items: center;
        justify-content: center;
        
        &.no-image {
            border: 2px dashed var(--color-outline);
        }
    }

    .behavior-info {
        outline: 1px solid var(--color-outline);
        background: var(--color-bg-2);
        box-shadow: -2px 0px 1px rgba($color: #000000, $alpha: 0.0621);
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
        width: 20rem;
        overflow-y: auto;
    }

    code {
        white-space: pre-wrap;
        word-break: break-all;
        height: 18rem;
        overflow: auto;
        background: var(--color-bg-1);
        padding: 0.75rem;
    }
</style>
