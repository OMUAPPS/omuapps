<script lang="ts">
    import { Game } from '../../core/game';
    import type { Receipt } from '../../core/game-state';

    interface Props {
        receipt: Receipt;
        animation?: boolean;
    }

    let { receipt, animation }: Props = $props();

    const game = Game.getInstance();
    const shop = game.states.shop.store;
</script>

<div class="receipt" class:animation>
    <h1 class="center">{$shop.shop.name}</h1>
    <div class="item">
        <span>Address</span>
        <small>{$shop.shop.address}</small>
    </div>
    <br>
    {receipt.date}
    <br>
    {receipt.order.user.name}
    <br>
    <div class="item">
        <span>Owner</span>
        <small>{$shop.shop.owner}</small>
    </div>
    <p class="center">------------------------------------</p>
    <br>
    {#each receipt.order.items as item, index (index)}
        <div class="item">
            <span>{item.name} #{item.id}</span>
            <small>1</small>
        </div>
    {/each}
    <br>
    {#if receipt.screenshot}
        {#await game.asset.getUrl(receipt.screenshot).promise then screenshot}
            {#if screenshot.type === 'ready'}
                <img src={screenshot.data} alt="">
            {/if}
        {/await}
    {/if}
    <br>
</div>

<style lang="scss">
    .receipt {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        background: var(--color-bg-2);
        color: var(--color-text);
        width: 20rem;
        padding: 2rem;
        font-family: "Zen Maru Gothic", sans-serif;
        font-weight: 700;
        font-style: normal;
        filter: drop-shadow(0 0 0.5px black);

        > img {
            height: 12rem;
            object-fit: contain;
            filter: saturate(0) contrast(2) brightness(0.9);
        }

        &::after,
        &::before {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            top: -13px;
            background: linear-gradient(45deg, var(--color-bg-2) 50%, transparent 52%),
                linear-gradient(315deg, var(--color-bg-2) 50%, transparent 52%);
            background-size: 16px 16px;
            height: 14px;
            bottom: 0;
        }

        &::before {
            top: unset;
            bottom: -13px;
            transform: scaleY(-1);
        }
    }

    .animation {
        animation: print forwards 0.621s linear;
    }

    @keyframes print {
        from {
            transform: translateY(-100%);
            clip-path: inset(100% 0 0% 0);
        }
        to {
            transform: translateY(0);
            clip-path: inset(-1rem);
        }
    }

    .center {
        text-align: center;
    }

    h1 {
        font-size: 1.5rem;
    }

    .item {
        display: flex;
        justify-content: space-between;
        width: 100%;
    }
</style>
