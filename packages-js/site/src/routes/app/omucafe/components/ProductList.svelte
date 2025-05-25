<script lang="ts">
    import { Button } from '@omujs/ui';
    import AssetImage from '../components/AssetImage.svelte';
    import { createHoldable } from '../game/behavior/holdable.js';
    import { createEffect } from '../game/effect.js';
    import { uniqueId } from '../game/helper.js';
    import { createItem } from '../game/item.js';
    import { getGame } from '../omucafe-app.js';

    export let type: 'product' | 'item' | 'effect' | undefined = undefined;
    export let search: string = '';

    const { gameConfig: config, scene } = getGame();

    function compareSearch(item: { name: string }, search: string): boolean {
        const formattedName = item.name.toLocaleLowerCase();
        const formattedSearch = search.toLocaleLowerCase();
        return formattedName.includes(formattedSearch);
    }
</script>

{#if type === 'product'}
    <div class="category">
        <span>
            <i class="ti ti-cup"></i>
            商品
        </span>
        <Button primary onclick={() => {
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
            <i class="ti ti-plus"></i>
        </Button>
    </div>
    <div class="list">
        {#each Object.entries($config.products).filter(([,item]) => compareSearch(item, search)) as [id, product] (id)}
            <button on:click={() => {
                $scene = { type: 'product_edit', id };
            }}>
                <div class="item">
                    {#if product.image}
                        <AssetImage asset={product.image} />
                    {/if}
                    <h2>{product.name}</h2>
                    {#if product.description}
                        <p>{product.description}</p>
                    {/if}
                </div>
            </button>
        {:else}
            <small>レシピがありません</small>
        {/each}
    </div>
{:else if type === 'item'}
    <div class="category">
        <span>
            <i class="ti ti-fish"></i>
            アイテム
        </span>
        <Button primary onclick={() => {
            const item = createItem({
                name: '新アイテム',
                behaviors: { holdable: createHoldable() },
            });
            $config.items[item.id] = item;
            $scene = { type: 'item_edit', id: item.id, created: true };
        }}>
            材料を追加
            <i class="ti ti-plus"></i>
        </Button>
    </div>
    <div class="list">
        {#each Object.entries($config.items).filter(([,item]) => compareSearch(item, search)) as [id, item] (id)}
            <button on:click={() => {
                $scene = { type: 'item_edit', id };
            }}>
                <div class="item">
                    <h2>{item.name}</h2>
                    {#if item.image}
                        <div class="image">
                            <AssetImage asset={item.image} />
                        </div>
                    {/if}
                </div>
            </button>
        {:else}
            <small>アイテムがありません</small>
        {/each}
    </div>
{:else if type === 'effect'}
    <div class="category">
        <span>
            <i class="ti ti-sparkles"></i>
            エフェクト
        </span>
        <Button primary onclick={() => {
            const effect = createEffect({
                name: '新エフェクト',
                attributes: {},
            });
            $config.effects[effect.id] = effect;
            $scene = { type: 'effect_edit', id: effect.id };
        }}>
            エフェクトを追加
            <i class="ti ti-plus"></i>
        </Button>
    </div>
    <div class="list">
        {#each Object.entries($config.effects).filter(([,item]) => compareSearch(item, search)) as [id, effect] (id)}
            <button on:click={() => {
                $scene = { type: 'effect_edit', id };
            }}>
                <div class="item">
                    <h2>{effect.name}</h2>
                </div>
            </button>
        {:else}
            <small>エフェクトがありません</small>
        {/each}
    </div>
{/if}

<style lang="scss">
    .category {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1rem;
        border-bottom: 1px solid var(--color-outline);
        margin-bottom: 0.5rem;
        padding-bottom: 1rem;

        > span {
            display: flex;
            align-items: baseline;
            gap: 0.5rem;
            font-size: 1.1621rem;
            font-weight: 600;
            color: var(--color-1);
        }
    }

    .list {
        display: flex;
        align-items: flex-start;
        flex-direction: column;
        margin-bottom: 4rem;

        > button {
            width: 100%;
            text-align: left;
            background: none;
            border: none;
            padding: 0;
            margin: 0;
        }
    }

    small {
        font-size: 0.8rem;
        color: var(--color-1);
        outline: 2px dashed var(--color-bg-2);
        padding: 1rem 2rem;
        width: 20rem;
        border-radius: 4px;
        filter: drop-shadow(0 0 0.5rem var(--color-outline));
    }

    .item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        background: var(--color-bg-2);
        color: var(--color-text);
        outline: 1px solid var(--color-outline);
        border-radius: 2px;
        padding: 0.6rem 1rem;
        margin-bottom: 0.75rem;

        > .image {
            width: 2rem;
            height: 2rem;
        }

        &:hover {
            transform: translateX(2px);
            box-shadow: 0 0 0.5rem var(--color-bg-1);
            outline: 1px solid var(--color-1);
            outline-offset: -1px;
            font-weight: 600;
            transition: all 0.02621s ease-in;
        }
    }
</style>
