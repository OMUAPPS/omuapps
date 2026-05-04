<script lang="ts">
    import { Tooltip } from '@omujs/ui';
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
    <div class="user">
        {receipt.order.customer.user.name}
        {#if receipt.order.customer.user.name}
            <div class="avatar">
                <Tooltip>
                    <img src={receipt.order.customer.user.avatar} alt="" class="avatar-preview">
                </Tooltip>
                <img src={receipt.order.customer.user.avatar} alt="" class="avatar">
            </div>
        {/if}
    </div>
    <br>
    <h1 class="center">{$shop.shop.name}</h1>
    <div class="item">
        <span>Address</span>
        <small>{$shop.shop.address}</small>
    </div>
    <br>
    {receipt.date}
    <br>
    <div class="item">
        <span>Owner</span>
        <small>{$shop.shop.owner}</small>
    </div>
    <p class="center">------------------------------------</p>
    <br>
    {#each receipt.order.products as item, index (index)}
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

    .user {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 1.5rem;
    }

    .avatar-preview {
        width: 12rem;
        height: 12rem;
    }

    .avatar {
        width: 3rem;
        height: 3rem;
        border-radius: 50%;
        object-fit: cover;
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
