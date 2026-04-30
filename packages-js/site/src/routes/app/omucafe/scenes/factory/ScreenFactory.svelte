<script lang="ts">
    import { Button, Tooltip } from '@omujs/ui';
    import EditText from '../../common/EditText.svelte';
    import type { Game } from '../../core/game';
    import EditItem from './EditItem.svelte';
    import EditProductEntry from './EditProductEntry.svelte';
    import { preview, type SceneFactoryData } from './factory';

    interface Props {
        scene: SceneFactoryData;
        game: Game;
    }

    let { game, scene = $bindable() }: Props = $props();

    function goBack() {
        game.startTransition({ type: 'kitchen' }, {
            title: 'キッチンへ移動中…',
            duration: 750,
        });
    }

</script>

<main>
    {#if game.side === 'client'}
        <div class="menu" data-input>
            <div class="panel">
                <Button onclick={goBack} primary>
                    <i class="ti ti-chevron-left"></i>
                    もどる
                </Button>
                <h1>商品研究所</h1>
                <p>
                    商品やアイテムを編集できます。
                </p>

                <div class="actions">
                    <Button primary onclick={() => {
                        game.startTransition({
                            type: 'export',
                        });
                    }}>
                        <Tooltip>
                            他の人に共有することができます。
                        </Tooltip>
                        輸出
                    </Button>
                </div>
            </div>
            {#if !scene.selecting}
                <div class="panel omu-scroll">
                    <h1>商品化</h1>
                    <Button primary onclick={() => {
                        scene.selecting = { type: 'pick_product' };
                        scene = { ...scene };
                    }}>
                        アイテムを選択する
                        <i class="ti ti-pointer"></i>
                    </Button>
                    <div class="product-list">
                        <h1>商品一覧</h1>
                        {#each game.states.products.values() as product (product.id)}
                            <div class="entry">
                                <button onclick={() => {
                                    scene.selecting = { type: 'edit_product', productId: product.id };
                                    scene = { ...scene };
                                }}>
                                    {#if $preview[product.itemId]}
                                        <img src={$preview[product.itemId].url} alt="">
                                    {/if}
                                    <EditText value={product.name} size="1.8rem" />
                                </button>
                            </div>
                        {:else}
                            商品がありません
                        {/each}
                    </div>
                </div>
            {:else if scene.selecting.type === 'pick_product'}
                {@const { selecting } = scene}
                <div class="panel">
                    <h1>商品にするアイテムを選択してください</h1>
                    <Button onclick={() => {
                        scene.selecting = selecting.back;
                        scene = { ...scene };
                    }} primary>
                        やめる
                        <i class="ti ti-x"></i>
                    </Button>
                </div>
            {:else if scene.selecting.type === 'edit_product'}
                <div class="panel omu-scroll">
                    <button class="close" onclick={() => {
                        scene.selecting = undefined;
                        scene = { ...scene };
                    }}>
                        閉じる
                        <i class="ti ti-x"></i>
                    </button>
                    <EditProductEntry id={scene.selecting.productId} />
                </div>
            {:else if scene.selecting.type === 'edit_item'}
                <div class="panel omu-scroll">
                    <button class="close" onclick={() => {
                        scene.selecting = undefined;
                        scene = { ...scene };
                    }}>
                        閉じる
                        <i class="ti ti-x"></i>
                    </button>
                    <EditItem id={scene.selecting.itemId} />
                </div>
            {/if}
        </div>
    {/if}
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
    }

    .menu {
        width: 26rem;
        display: flex;
        flex-direction: column;
        gap: 2rem;
        padding: 2rem;
        padding-right: 0;
        background: linear-gradient(
            to right,
            color-mix(in srgb, var(--color-bg-1) 50%, transparent 0%),
            transparent
        );
    }

    .panel {
        position: relative;
        display: flex;
        align-items: stretch;
        flex-direction: column;
        padding: 1.5rem 1.5rem;
        background: var(--color-bg-1);
        box-shadow: 0 0 1rem rgba($color: #888, $alpha: 0.3);
        border-radius: 0.25rem;

        > .close {
            align-self: flex-start;
            padding: 0.75rem 1.5rem;
            margin: 2px;
            font-weight: 600;
            font-size: 0.9rem;
            background: var(--color-1);
            color: var(--color-bg-1);
            border-radius: 2px;
            border: none;
            cursor: pointer;
            margin-bottom: 2rem;
        }
    }

    h1 {
        margin: 0.5rem 0;
        margin-top: 1rem;
        text-align: left;
        font-size: 1.5rem;
        color: var(--color-1);
        corner-shape: squircle;
        padding: 0.5rem 0;
        border-bottom: 2px solid var(--color-1);
        width: 100%;
        margin-bottom: 1rem;
    }

    .product-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;

        .entry {
            width: 100%;
            outline: 1px solid var(--color-outline);
            border-radius: 0.5rem;
            overflow: hidden;

            > button {
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1rem;
                padding: 0.75rem 1.5rem;
                background: var(--color-bg-2);
                color: var(--color-text);
                border-radius: 2px;
                border: none;
                cursor: pointer;

                > img {
                    width: 8rem;
                    height: 8rem;
                    object-fit: contain;
                }
            }
        }
    }

    .actions {
        margin-top: 2rem;
    }
</style>
