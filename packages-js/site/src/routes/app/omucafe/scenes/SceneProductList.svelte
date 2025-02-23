<script lang="ts">
    import AssetImage from '../components/AssetImage.svelte';
    import BackButton from '../components/BackButton.svelte';
    import { createEffect } from '../game/effect.js';
    import { uniqueId } from '../game/helper.js';
    import { createItem } from '../game/item.js';
    import { getGame, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    $: console.log('SceneProductList', context);
    const { config, scene } = getGame();
</script>

<main>
    <h1>
        商品一覧
    </h1>
    <button on:click={() => {
        const id = uniqueId();
        $config.products = {
            ...$config.products,
            [id]: {
                id,
                name: '新商品',
                recipe: {
                    ingredients: {},
                    steps: [],
                },
            },
        };
        $scene = { type: 'product_edit', id };
    }}>
        レシピを作る
    </button>
    <div class="product-list">
        {#each Object.entries($config.products) as [id, product] (id)}
            <div class="product card">
                {#if product.image}
                    <AssetImage asset={product.image} />
                {/if}
                <h2>{product.name}</h2>
                {#if product.description}
                    <p>{product.description}</p>
                {/if}
                <button on:click={() => {
                    $scene = { type: 'product_edit', id };
                }}>
                    詳細
                </button>
            </div>
        {/each}
    </div>
    <button on:click={() => {
        const item = createItem({
            name: '新商品',
        });
        $config.items[item.id] = item;
        $scene = { type: 'item_edit', id: item.id };
    }}>
        材料を追加
    </button>
    <div class="item-list">
        {#each Object.entries($config.items) as [id, item] (id)}
            <button on:click={() => {
                $scene = { type: 'item_edit', id };
            }}>
                <div class="item card">
                    <h2>{item.name}</h2>
                    {#if item.image}
                        <div class="image">
                            <AssetImage asset={item.image} />
                        </div>
                    {/if}
                </div>
            </button>
        {/each}
    </div>
    <button on:click={() => {
        const effect = createEffect({
            name: '新エフェクト',
            attributes: {},
        });
        $config.effects[effect.id] = effect;
        $scene = { type: 'effect_edit', id: effect.id };
    }}>
        エフェクトを追加
    </button>
    <div class="item-list">
        {#each Object.entries($config.effects) as [id, effect] (id)}
            <button on:click={() => {
                $scene = { type: 'effect_edit', id };
            }}>
                <div class="item card">
                    <h2>{effect.name}</h2>
                </div>
            </button>
        {/each}
    </div>
</main>
<BackButton />

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: row;
        margin: 1rem;
        margin-left: 10rem;
        gap: 1rem;
    }

    .product-list,
    .item-list {
        display: flex;
        align-items: flex-start;
        flex-direction: column;
    }

    .card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        background: var(--color-bg-2);
        padding: 0.5rem 1rem;
        width: 20rem;

        > .image {
            width: 2rem;
            height: 2rem;
        }
    }
</style>
