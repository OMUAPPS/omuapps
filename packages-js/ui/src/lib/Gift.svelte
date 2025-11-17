<script lang="ts">
    import type { Models } from '@omujs/chat';
    import Tooltip from './Tooltip.svelte';
    import { omu } from './stores.js';

    export let gift: Models.Gift;
</script>

<div class="gift">
    <Tooltip>
        {gift.name}
        <small>
            id: {gift.id}
            amount: {gift.amount}
        </small>
    </Tooltip>
    <div class="image">
        {#if gift.imageUrl}
            <img src={$omu.assets.proxy(gift.imageUrl)} alt="gift" width="32" height="32" />
        {:else}
            {gift.name}
        {/if}
    </div>
    <div class="info">
        {gift.name}
        {#if gift.amount}
            {gift.amount > 1 ? `x${gift.amount}` : ''}
        {/if}
    </div>
</div>

<style lang="scss">
    .gift {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 5px;
        align-items: center;
        justify-content: space-between;
        width: fit-content;
        min-width: 90px;
        height: 90px;
        padding: 5px 10px;

        .image {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 60px;
            font-size: 24px;
        }

        img {
            width: 60px;
            height: 60px;
        }

        .info {
            height: 20px;
            font-size: 12px;
            font-weight: bold;
            color: var(--color-1);
            white-space: nowrap;
        }
    }

    small {
        display: block;
        margin-top: 4px;
        font-size: 10px;
        font-weight: lighter;
    }
</style>
