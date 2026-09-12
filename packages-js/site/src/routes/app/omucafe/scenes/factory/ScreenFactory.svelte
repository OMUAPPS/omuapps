<script lang="ts">
    import { Button, Tooltip } from '@omujs/ui';
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
            {#if !scene.selecting}
                <header class="panel heading">
                    <h1>商品研究所</h1>
                    <Button onclick={goBack} primary>
                        <i class="ti ti-chevron-left"></i> キッチンに戻る
                    </Button>
                </header>
            {/if}
            <section class="panel editor">
                {#if scene.selecting}
                    <div class="editor-heading">
                        <Button onclick={() => {
                            scene.selecting = scene.selecting?.type === 'pick_product' ? scene.selecting.back : undefined;
                            scene = { ...scene };
                        }} primary>
                            <i class="ti ti-chevron-left"></i>
                            {scene.selecting.type === 'pick_product' ? '選択をやめる' : '商品一覧へ'}
                        </Button>
                        <h2>{scene.selecting.type === 'edit_product' ? '商品設定' : scene.selecting.type === 'edit_item' ? 'アイテム編集' : '商品にするアイテムを選択'}</h2>
                    </div>
                {/if}
                <div class="content">
                    {#if !scene.selecting}
                        <h2>
                            商品一覧
                        </h2>
                        <Button primary onclick={() => {
                            scene.selecting = { type: 'pick_product' };
                            scene = { ...scene };
                        }}>
                            <i class="ti ti-plus"></i> 商品を作る
                        </Button>
                        <div class="product-list">
                            {#each game.states.products.values() as product (product.id)}
                                <button class="entry" onclick={() => {
                                    scene.selecting = { type: 'edit_product', productId: product.id };
                                    scene = { ...scene };
                                }}>
                                    {#if $preview[product.itemId]}
                                        <img src={$preview[product.itemId].url} alt="">
                                    {:else}
                                        <span class="placeholder"><i class="ti ti-package"></i></span>
                                    {/if}
                                    <span class="product-info">
                                        <strong>{product.name}</strong>
                                        <small>{product.hidden ? '裏メニュー' : 'メニューに表示'}</small>
                                    </span>
                                    <i class="ti ti-chevron-right"></i>
                                </button>
                            {:else}
                                <p class="empty">商品はまだありません。作業台にアイテムを用意して「商品を作る」から登録できます。</p>
                            {/each}
                        </div>
                        <p>形や配置を変えるときは、作業台のアイテムをクリックしてください。</p>
                    {:else if scene.selecting.type === 'pick_product'}
                        <p class="instruction">作業台または冷蔵庫のアイテムにマウスを合わせ、「商品化する」を選んでクリックしてください。</p>
                        <p>選んだアイテムをコピーして商品に登録します。</p>
                    {:else if scene.selecting.type === 'edit_product'}
                        {#key scene.selecting.productId}
                            <EditProductEntry id={scene.selecting.productId} />
                        {/key}
                    {:else if scene.selecting.type === 'edit_item'}
                        {#key scene.selecting.itemId}
                            <EditItem id={scene.selecting.itemId} />
                        {/key}
                    {/if}
                </div>
            </section>
            {#if !scene.selecting}
                <footer class="panel">
                    <h2>
                        共有
                    </h2>
                    <Button onclick={() => game.startTransition({ type: 'export' })} primary>
                        <Tooltip>箱にアイテムを入れて、共有用のファイルを書き出します。</Tooltip>
                        <i class="ti ti-share-2"></i> アイテムを共有…
                    </Button>
                </footer>
            {/if}
        </div>
    {/if}
</main>

<style lang="scss">
    main { position: absolute; inset: 0; display: flex; pointer-events: none; }
    .menu {
        box-sizing: border-box;
        width: min(28rem, 100%);
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        pointer-events: auto;
        min-height: 0;
    }
    .panel {
        background: var(--color-bg-1);
        color: var(--color-text);
        border: 1px solid var(--color-outline);
        border-radius: 0.5rem;
        padding: 1rem;
        flex-shrink: 0;
    }
    .heading { display: flex; flex-direction: column; gap: 0.5rem; }
    h1 { margin: 0; font-size: 1.4rem; color: var(--color-1); }
    h2 {
        margin: 0 0 0.75rem;
        font-size: 1.1rem;
        color: var(--color-1);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    p { margin: 0 0 0.75rem; font-size: 0.875rem; line-height: 1.6; }
    .editor { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .editor-heading {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--color-outline);
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        h2 { margin: 0; }
    }
    .content { overflow-y: auto; min-height: 0; padding: 1rem; }
    .product-list { display: flex; flex-direction: column; gap: 0.5rem; margin: 1rem 0; }
    .entry {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        padding: 0.75rem;
        border: 1px solid var(--color-outline);
        border-radius: 0.5rem;
        background: var(--color-bg-2);
        color: var(--color-text);
        text-align: left;
        cursor: pointer;
        img, .placeholder { width: 3.5rem; height: 3.5rem; object-fit: contain; flex-shrink: 0; }
        .placeholder { display: grid; place-items: center; font-size: 1.5rem; }
        &:hover { border-color: var(--color-1); }
        &:focus-visible { outline: 2px solid var(--color-1); outline-offset: 2px; }
    }
    .product-info {
        flex: 1;
        min-width: 0;
        overflow-wrap: anywhere;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        small { font-size: 0.75rem; }
    }
    .instruction, .empty { padding: 1rem; background: var(--color-bg-2); border-radius: 0.5rem; }
    @media (max-height: 600px) {
        .menu { gap: 0.5rem; padding: 0.5rem; }
        .panel { padding: 0.75rem; }
        .editor { padding: 0; }
    }
</style>
