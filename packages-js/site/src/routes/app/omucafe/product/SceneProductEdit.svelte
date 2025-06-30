<script lang="ts">
    import { FileDrop } from '@omujs/ui';
    import { uploadAssetByFile } from '../asset/asset.js';
    import AssetImage from '../components/AssetImage.svelte';
    import BackButton from '../components/BackButton.svelte';
    import { getGame } from '../omucafe-app.js';
    import type { SceneContext } from '../scenes/scene.js';

    export let context: SceneContext;
    $: console.log('SceneProductEdit', context);

    const { scene, gameConfig: config } = getGame();
</script>

<main>
    {#if $scene.type === 'product_edit'}
        {@const id = $scene.id}
        <div class="info">
            <h3>商品詳細</h3>
            <div class="image" class:no-image={!$config.products[id].image}>
                {#if $config.products[id].image}
                    {@const asset = $config.products[id].image}
                    <AssetImage asset={asset} />
                {:else}
                    <FileDrop handle={async (fileList) => {
                        if (fileList.length !== 1) {
                            throw new Error('FileDrop must receive only one file');
                        }
                        $config.products[id].image = await uploadAssetByFile(fileList[0]);
                    }} accept="image/*">
                        <p>商品画像を追加</p>
                    </FileDrop>
                {/if}
            </div>
            <label>
                商品名
                <input type="text" bind:value={$config.products[id].name} />
            </label>
            <label>
                説明
                <textarea bind:value={$config.products[id].description} rows="10"></textarea>
            </label>
        </div>
        <div class="recipe">
            <h3>レシピ</h3>
            <ul class="steps">
                {#each $config.products[id].recipe.steps as step, i (i)}
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
                $config.products[id].recipe.steps = [
                    ...$config.products[id].recipe.steps,
                    {
                        image: await uploadAssetByFile(fileList[0]),
                        text: '',
                    },
                ];
            }} accept="image/*">
                <p>ステップを追加</p>
            </FileDrop>
        </div>
    {/if}
</main>
<BackButton to={{type: 'product_list'}} active={context.active}/>

<style lang="scss">
    main {
        position: absolute;
        inset: 10%;
        background: var(--color-bg-2);
        color: var(--color-1);
        display: flex;
        gap: 1rem;
        outline: 1px solid var(--color-outline);
    }

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
        height: 10rem;
        display: flex;
        align-items: center;
        justify-content: center;
        
        &.no-image {
            border: 2px dashed var(--color-outline);
        }
    }
</style>
