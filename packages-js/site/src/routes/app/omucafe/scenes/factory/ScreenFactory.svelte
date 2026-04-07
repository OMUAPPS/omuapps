<script lang="ts">
    import { Button } from '@omujs/ui';
    import type { Game } from '../../core/game';
    import EditItem from './EditItem.svelte';
    import EditProduct from './EditProduct.svelte';
    import { type SceneFactoryData } from './factory';

    interface Props {
        scene: SceneFactoryData;
        game: Game;
    }

    let { game, scene }: Props = $props();

    function goBack() {
        game.startTransition({ type: 'kitchen' });
    }

</script>

<main>
    {#if game.side === 'client'}
        <div class="menu">
            <div class="panel">
                <Button onclick={goBack} primary>
                    <i class="ti ti-chevron-left"></i>
                    もどる
                </Button>
                <h1>工場</h1>
            </div>
            {#if !scene.selecting}
                <div class="panel">
                    <Button primary onclick={() => {
                        scene.selecting = { type: 'pick_product' };
                    }}>
                        商品にするアイテムを選択する
                        <i class="ti ti-pointer"></i>
                    </Button>
                    {#each game.states.products.values() as product (product.id)}
                        <Button onclick={() => {
                            scene.selecting = { type: 'edit_product', productId: product.id };
                        }} primary>
                            {product.name}
                        </Button>
                    {:else}
                        商品がありません
                    {/each}
                </div>
            {:else if scene.selecting.type === 'pick_product'}
                <div class="panel">
                    アイテムを選択してください
                </div>
            {:else if scene.selecting.type === 'edit_product'}
                <div class="panel omu-scroll">
                    <button class="close" onclick={() => {
                        scene.selecting = undefined;
                    }}>
                        閉じる
                        <i class="ti ti-x"></i>
                    </button>
                    <EditProduct id={scene.selecting.productId} />
                </div>
            {:else if scene.selecting.type === 'edit_item'}
                <div class="panel omu-scroll">
                    <button class="close" onclick={() => {
                        scene.selecting = undefined;
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
    }

    .panel {
        position: relative;
        display: flex;
        flex-direction: column;
        padding: 1.5rem 1.5rem;
        background: var(--color-bg-1);
        box-shadow: 0 0 1rem rgba($color: #000000, $alpha: 0.3);

        > .close {
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
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
        }
    }

    h1 {
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

    h1 {
        border-bottom: 2px solid var(--color-1);
        width: 100%;
        margin-bottom: 1rem;
    }
</style>
