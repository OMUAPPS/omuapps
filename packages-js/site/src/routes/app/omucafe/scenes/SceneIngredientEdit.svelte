<script lang="ts">
    import { FileDrop } from '@omujs/ui';
    import AssetImage from '../components/AssetImage.svelte';
    import BackButton from '../components/BackButton.svelte';
    import { game, uploadAsset, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    $: console.log('SceneIngredientEdit', context);
    
    const { scene, config } = game;
</script>

<main>
    {#if $scene.type === 'ingredient_edit'}
        {@const id = $scene.id}
        <div class="info">
            <h3>商品詳細</h3>
            <div class="image" class:no-image={!$config.ingredients[id].image}>
                {#if $config.ingredients[id].image}
                    {@const asset = $config.ingredients[id].image}
                    <AssetImage asset={asset} />
                {:else}
                    <FileDrop handle={async (fileList) => {
                        if (fileList.length !== 1) {
                            throw new Error('FileDrop must receive only one file');
                        }
                        $config.ingredients[id].image = await uploadAsset(fileList[0]);
                    }} accept="image/*">
                        <p>商品画像を追加</p>
                    </FileDrop>
                {/if}
            </div>
            <label>
                商品名
                <input type="text" bind:value={$config.ingredients[id].name} />
            </label>
        </div>
    {/if}
</main>
<BackButton />

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
</style>
