<script lang="ts">
    import menu_board from '../asset/images/menu_board.svg';
    import { getGame } from '../omucafe-app.js';

    const { gameConfig } = getGame();
</script>

<div class="menu">
    {#if $gameConfig.menu.enabled}
        <img src={menu_board} alt="">
        <div class="items">
            {#each $gameConfig.menu.items as entry, index (index)}
                {@const product = $gameConfig.products[entry.product]}
                <div class="entry">
                    {product.name}
                </div>
            {/each}
        </div>
    {/if}
</div>

<style lang="scss">
    .menu {
        position: relative;
        width: 47rem;
        height: 24rem;
    }

    img {
        position: absolute;
        left: 0;
        bottom: 0;
    }

    .items {
        position: absolute;
        bottom: 6rem;
        left: 3rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .entry {
        background: #EFCEAA;
        border: 5px solid #F9E1C7;
        padding: 0.5rem 1rem;
        rotate: -2deg;
        width: fit-content;
        font-size: 2rem;
        font-family: "LXGW Marker Gothic", sans-serif;
        color: #8F6230;
    }
</style>
