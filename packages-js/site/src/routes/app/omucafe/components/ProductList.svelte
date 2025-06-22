<script lang="ts">
    import { Button } from '@omujs/ui';
    import AssetImage from '../components/AssetImage.svelte';
    import { createHoldable } from '../game/behavior/holdable.js';
    import { createEffect } from '../game/effect.js';
    import { uniqueId } from '../game/helper.js';
    import { createItem } from '../game/item.js';
    import { createScript } from '../game/script.js';
    import { Time } from '../game/time.js';
    import { getGame } from '../omucafe-app.js';

    export let type: 'product' | 'item' | 'effect' | 'script' | undefined = undefined;
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
                        <div class="image">
                            <AssetImage asset={product.image} />
                        </div>
                    {/if}
                    <span>{product.name}</span>
                </div>
            </button>
        {:else}
            {#if search && Object.keys($config.products).length > 0}
                <small>レシピが見つかりません</small>
            {:else}
                <small>レシピがありません</small>
            {/if}
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
                    {#if item.image}
                        <div class="image">
                            <AssetImage asset={item.image} />
                        </div>
                    {/if}
                    <span>{item.name}</span>
                </div>
            </button>
        {:else}
            {#if search && Object.keys($config.items).length > 0}
                <small>アイテムが見つかりません</small>
            {:else}
                <small>アイテムがありません</small>
            {/if}
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
            $scene = { type: 'effect_edit', id: effect.id, time: Time.now() };
        }}>
            エフェクトを追加
            <i class="ti ti-plus"></i>
        </Button>
    </div>
    <div class="list">
        {#each Object.entries($config.effects).filter(([,item]) => compareSearch(item, search)) as [id, effect] (id)}
            <button on:click={() => {
                $scene = { type: 'effect_edit', id, time: Time.now() };
            }}>
                <div class="item">
                    <div class="image">
                        <i class="ti ti-wand"></i>
                    </div>
                    <span>{effect.name}</span>
                </div>
            </button>
        {:else}
            {#if search && Object.keys($config.effects).length > 0}
                <small>エフェクトが見つかりません</small>
            {:else}
                <small>エフェクトがありません</small>
            {/if}
        {/each}
    </div>
{:else if type === 'script'}
    <div class="category">
        <span>
            <i class="ti ti-code"></i>
            スクリプト
        </span>
        <Button primary onclick={() => {
            const script = createScript({});
            $config.scripts[script.id] = script;
        }}>
            スクリプトを追加
            <i class="ti ti-plus"></i>
        </Button>
    </div>
    <div class="list">
        {#each Object.entries($config.scripts).filter(([,item]) => compareSearch(item, search)) as [id, effect] (id)}
            <button on:click={() => {
                $scene = { type: 'script_edit', id };
            }}>
                <div class="item">
                    <div class="image">
                        <i class="ti ti-code"></i>
                    </div>
                    <span>{effect.name}</span>
                </div>
            </button>
        {:else}
            {#if search && Object.keys($config.scripts).length > 0}
                <small>エフェクトが見つかりません</small>
            {:else}
                <small>エフェクトがありません</small>
            {/if}
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
        display: grid;
        // two rows, auto-fill columns
        grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
        gap: 0.75rem;
        margin-bottom: 1rem;

        > button {
            background: none;
            border: none;
            padding: 0;
            margin: 0;

            &:hover > .item {
                transform: translateY(2px);
                box-shadow: 0 0 0.5rem var(--color-bg-1);
                outline: 1px solid var(--color-1);
                outline-offset: -1px;
                transition: all 0.02621s ease-in;
            }
        }
    }

    .item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        background: var(--color-bg-2);
        color: var(--color-text);
        outline: 1px solid var(--color-outline);
        border-radius: 2px;
        padding: 1rem 1rem;
        height: 9rem;
        font-size: 0.9rem;
        font-weight: 600;

        > h2 {
            display: -webkit-box;
            line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        > .image {
            width: 5rem;
            height: 5rem;
            display: flex;
            align-content: center;
            justify-content: center;
            font-size: 3.5rem;
            color: var(--color-outline);
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
</style>
