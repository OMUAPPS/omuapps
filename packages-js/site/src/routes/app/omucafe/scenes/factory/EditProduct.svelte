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

{#if $preview[$product.itemId]}
    <div class="info">
        <div class="preview">
            <img src={$preview[$product.itemId].url} alt="">
        </div>
        <div class="name">
            <small>商品名</small>
            <EditText bind:value={$product.name} size="1.8rem" />
        </div>
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
            game.states.products.delete(id);
            game.states.scene.value = {
                type: 'factory',
            };
        }} primary>
            商品を削除
            <i class="ti ti-trash"></i>
        </Button>
    </div>
    {id}
{/if}

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
    }
</style>
