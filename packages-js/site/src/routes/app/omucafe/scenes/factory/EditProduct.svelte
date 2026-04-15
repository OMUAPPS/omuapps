<script lang="ts">
    import { Button } from '@omujs/ui';
    import EditText from '../../common/EditText.svelte';
    import { Game } from '../../core/game';
    import { preview } from './factory';

    interface Props {
        id: string;
    }

    let { id }: Props = $props();

    const game = Game.getInstance();
    let product = game.states.products.getStore(id);

    if (!$product) {
        throw new Error(`Product with id ${id} not found.`);
    }
</script>

<div class="info">
    <div class="preview">
        {#if $preview[$product.itemId]}
            <img src={$preview[$product.itemId].url} alt="">
        {/if}
    </div>
    <div class="name">
        <small>商品名</small>
        <EditText bind:value={$product.name} size="1.8rem" />
    </div>
</div>
<h2>反応する文字</h2>
<div class="aliases">
    <Button onclick={() => {
        $product.aliases = [...$product.aliases, ''];
    }} primary>
        追加する
        <i class="ti ti-plus"></i>
    </Button>
    <div class="entry">
        <input type="text" value={$product.name} disabled />
    </div>
    {#each $product.aliases as _, index (index)}
        <div class="entry">
            <input type="text" bind:value={() => $product.aliases[index], (alias) => {
                $product.aliases[index] = alias;
                $product.aliases = [...$product.aliases];
            }} />
            <button title="削除" onclick={() => {
                $product.aliases = $product.aliases.filter((_, i) => i !== index);
            }}>
                <i class="ti ti-x"></i>
            </button>
        </div>
    {/each}
</div>
<div class="actions">
    <Button onclick={() => {
        game.states.scene.value = {
            type: 'factory',
            selecting: {
                type: 'pick_product',
                productId: id,
                back: { type: 'edit_product', productId: id },
            },
        };
    }} primary>
        アイテムを選択し直す
    </Button>
    <Button onclick={() => {
        const factory = game.states.factory.value;
        const item = game.item.get($product.itemId);
        if (!item) return;
        const clone = game.item.clone(item);
        game.item.dettachItem(clone);
        game.item.setPool(clone, factory);
        clone.transform.offset = { x: 0, y: 100 };
    }} primary>
        アイテムを召喚する
    </Button>
    <Button onclick={() => {
        game.states.products.delete(id);
        game.states.scene.value = {
            type: 'factory',
        };
    }} primary>
        商品を削除
        <i class="ti ti-trash"></i>
    </Button>
</div>

<style lang="scss">
    .info {
        padding: 1rem;
    }

    .preview {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        width: 100%;
        height: 8rem;

        > img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
    }

    .name {
        padding: 0.5rem 0;
        margin-top: 1rem;
        text-align: center;
        border-bottom: 1px solid var(--color-1);
        margin-bottom: 2rem;

        > small {
            color: var(--color-text);
            opacity: 0.6;
        }
    }

    .actions {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 2rem;
    }

    h2 {
        color: var(--color-1);
        margin: 0.5rem 0;
        margin-top: 1rem;
        text-align: left;
        font-size: 1.5rem;
        color: var(--color-1);
        corner-shape: squircle;
        padding: 0.5rem 0;
        width: fit-content;
    }

    .aliases {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        .entry {
            display: flex;
            align-items: center;
            gap: 0.5rem;

            input {
                flex: 1;
                padding: 0.5rem;
                background: var(--color-bg-2);
                color: var(--color-text);
                border-radius: 2px;
                border: none;
            }

            button {
                background: transparent;
                color: var(--color-text);
                border: none;
                cursor: pointer;
            }
        }
    }
</style>
