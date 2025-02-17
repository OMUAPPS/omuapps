<script lang="ts">
    import AssetImage from '../components/AssetImage.svelte';
    import BackButton from '../components/BackButton.svelte';
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
        const id = Date.now().toString();
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
    <button on:click={() => {
        const id = Date.now().toString();
        $config.items = {
            ...$config.items,
            [id]: createItem({
                id,
                name: '新商品',
            }),
        };
        $scene = { type: 'item_edit', id };
    }}>
        材料を追加
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
    <div class="item-list">
        {#each Object.entries($config.items) as [id, item] (id)}
            <div class="item card">
                {#if item.image}
                    <AssetImage asset={item.image} />
                {/if}
                <h2>{item.name}</h2>
                <button on:click={() => {
                    $scene = { type: 'item_edit', id };
                }}>
                    詳細
                </button>
            </div>
        {/each}
    </div>
</main>
<BackButton />

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        margin: 10%;
    }

    .product-list,
    .item-list {
        margin-top: 1rem;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
    }

    .card {
        background: var(--color-bg-2);
        padding: 1rem;
    }
</style>
