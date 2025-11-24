<script lang="ts">
    import AssetImage from '../components/AssetImage.svelte';
    import { getGame } from '../omucafe-app.js';
    import type { GalleryItem } from './gallery.js';

    const { gameConfig } = getGame();

    export let entry: GalleryItem;
    $: order = entry.order;
</script>

<article>
    <div class="image">
        <AssetImage asset={entry.asset} />
    </div>
    <img src="" alt="">
    {#if order}
        <div class="order">
            <div class="user">
                <img src={order.user.avatar} class="avatar" alt="Avatar" />
                <h1>
                    {order.user.name}
                </h1>
            </div>
            <ul class="items">
                {#each order.items as item, i (i)}
                    {@const product = $gameConfig.products[item.product_id]}
                    <li class="item">
                        <span class="name">{product.name}</span>
                    </li>
                {/each}
            </ul>
        </div>
    {/if}
</article>

<style lang="scss">
    article {
        display: flex;
        align-items: center;
        width: fit-content;
        gap: 5%;
        margin: 5rem 50%;
        transform: translateX(-50%);
        white-space: nowrap;
    }

    .image {
        background: var(--color-bg-2);
        padding: 1rem;
        width: 40rem;
    }

    .order {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .items {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 0;
        margin-left: 2rem;
    }

    .user {
        display: flex;
        align-items: center;
    }

    .avatar {
        width: 3rem;
        height: 3rem;
        border-radius: 50%;
        margin-right: 1rem;
    }
</style>
