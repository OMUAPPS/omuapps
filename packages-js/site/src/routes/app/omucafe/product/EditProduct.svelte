<script lang="ts">
    import { Button, FileDrop } from '@omujs/ui';
    import { uploadAssetByBlob } from '../asset/asset.js';
    import AssetImage from '../components/AssetImage.svelte';
    import { acquireRenderLock } from '../game/game.js';
    import { getGame } from '../omucafe-app.js';
    import type { Product } from './product.js';

    const { scene } = getGame();

    export let product: Product;
</script>

<div class="info">
    <h3>商品詳細</h3>
    <div class="image" class:no-image={!product.image}>
        {#if product.image}
            {@const asset = product.image}
            <AssetImage asset={asset} />
        {/if}
        <div class="actions">
            <FileDrop handle={async (fileList) => {
                if (fileList.length !== 1) {
                    throw new Error('FileDrop must receive only one file');
                }
                product.image = await uploadAssetByBlob(fileList[0]);
            }} accept="image/*" primary={!product.image}>
                {#if product.image}
                    <p>商品画像を編集</p>
                {:else}
                    <p>商品画像を追加</p>
                {/if}
            </FileDrop>
            <Button primary={!product.image} onclick={async () => {
                await acquireRenderLock();
                $scene = {
                    type: 'product_take_photo',
                    id: product.id,
                };
            }}>
                写真を撮る
            </Button>
        </div>
    </div>
    <label>
        商品名
        <input type="text" bind:value={product.name} />
    </label>
    <label>
        説明
        <textarea bind:value={product.description} rows="10"></textarea>
    </label>
</div>
<div class="recipe">
    <h3>レシピ</h3>
    <ul class="steps">
        {#each product.recipe.steps as step, i (i)}
            <li class="step">
                <p>
                    ステップ{i + 1}
                </p>
                <div class="image">
                    <AssetImage asset={step.image} />
                </div>
                <input type="text" bind:value={step.text} />
            </li>
        {/each}
    </ul>
    <FileDrop handle={async (fileList) => {
        if (fileList.length !== 1) {
            throw new Error('FileDrop must receive only one file');
        }
        product.recipe.steps = [
            ...product.recipe.steps,
            {
                image: await uploadAssetByBlob(fileList[0]),
                text: '',
            },
        ];
    }} accept="image/*">
        <p>ステップを追加</p>
    </FileDrop>
</div>

<style lang="scss">
    .info {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 20rem;
        height: 100%;
        padding: 1rem;
        border-right: 1px solid var(--color-outline);

        > label {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
    }

    .actions {
        display: flex;
        gap: 1rem;
    }

    .recipe {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
        flex: 1;
        overflow-y: auto;
    }

    .steps {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
        gap: 1rem;
        padding: 1rem;
    }

    .step {
        > .image {
            width: 100%;
            height: 20rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    }

    h3 {
        border-bottom: 1px solid var(--color-1);
        padding-bottom: 0.25rem;
        margin-bottom: 1rem;
    }

    input, textarea {
        padding: 0.5rem;
        border: 1px solid var(--color-outline);

        &:focus {
            outline: none;
            border-color: var(--color-1);
        }
    }

    textarea {
        resize: vertical;
    }

    .image {
        width: 100%;
        height: 12rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding-bottom: 1rem;

        &.no-image {
            border: 2px dashed var(--color-outline);
        }
    }
</style>
