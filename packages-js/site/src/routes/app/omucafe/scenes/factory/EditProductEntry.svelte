<script lang="ts">
    import { Button, Checkbox, Tooltip } from '@omujs/ui';
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

    <label>
        <Tooltip>
            メニューから隠します
        </Tooltip>
        裏メニュー
        <Checkbox bind:value={$product.hidden} />
    </label>
</div>
<details name="product-settings">
    <summary>注文キーワード</summary>
    <p class="help">チャットで <strong>#{$product.name}</strong> と送ると注文できます。別の呼び方も追加できます。</p>
    <div class="aliases">
        <Tooltip>
            チャットで「#」の後にこの文字が打たれたら注文とみなします
        </Tooltip>
        <Button onclick={() => {
            $product.aliases = [...$product.aliases, ''];
        }} primary>
            別の呼び方を追加
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
                    <Tooltip>
                        この反応する文字を削除します
                    </Tooltip>
                    <i class="ti ti-x"></i>
                </button>
            </div>
        {/each}
    </div>
</details>
<details name="product-settings">
    <summary>商品に使うアイテム</summary>
    <p class="help">見た目を変えるには、作業台にコピーを置いて編集し、商品のアイテムを差し替えてください。</p>
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
            商品のアイテムを差し替える
        </Button>
        <Button onclick={() => {
            game.addTask(async () => {
                const factory = game.states.factory.value;
                const item = game.item.get($product.itemId);
                if (!item) return;
                const clone = game.item.clone(item);
                game.item.dettachItem(clone);
                game.item.setPool(clone, factory);
                clone.transform.offset = { x: 0, y: 100 };
            });
        }} primary>
            作業台にコピーを置く
        </Button>
    </div>
</details>
<details name="product-settings">
    <summary>商品の削除</summary>
    <p class="help">この商品を注文できる商品の一覧から削除します。</p>
    <div class="actions">
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

</details>

<style lang="scss">
    .help { font-size: 0.875rem; line-height: 1.6; margin: 0.5rem 0 1rem; }

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

    label {
        display: flex;
        justify-content: space-between;
    }

    .actions {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    details { margin-top: 0.75rem; padding: 0.75rem; border: 1px solid var(--color-outline); border-radius: 0.5rem; }
    summary { cursor: pointer; font-weight: 600; color: var(--color-1); }
    details[open] > summary { margin-bottom: 1rem; }

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
                color: #000;
                border: none;
                border-bottom: 1px solid var(--color-1);
                border-radius: 2px;

                &:disabled {
                    color: var(--color-text);
                }
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
