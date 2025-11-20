<script lang="ts">
    import { getGame } from '../omucafe-app.js';
    import { updateOrder, type Order } from './order.js';

    const { gameConfig, states } = getGame();

    interface Props {
        entry: Order;
        selected?: boolean;
    }

    let { entry = $bindable(), selected = false }: Props = $props();
    let user = $derived(entry.user);
    let items = $derived(entry.items);
</script>

<div class="order" class:selected class:current={$states.kitchen.order?.id === entry.id}>
    <div class="user">
        {#if user.avatar}
            <img src={user.avatar} class="avatar" alt="" />
        {:else}
            <i class="avatar ti ti-user" style="font-size: 32px;"></i>
        {/if}
        {user.name}
        {#if user.screen_id}
            <small class="id">{user.screen_id}</small>
        {/if}
    </div>
    {#each items as item, i (i)}
        {@const product = $gameConfig.products[item.product_id]}
        <ul>
            <li>
                {product.name}
                {#if item.notes}
                    {`(${item.notes})`}
                {/if}
            </li>
        </ul>
    {/each}
    {#if entry.status.type === 'waiting'}
        <button onclick={async () => {
            entry.status.type = 'cooking';
            await updateOrder(entry);
        }}>
            料理開始
        </button>
    {/if}
    {#if entry.status.type === 'cooking'}
        <button onclick={async () => {
            entry.status.type = 'done';
            await updateOrder(entry);
        }}>
            完了
        </button>
    {/if}
</div>

<style lang="scss">
    .order {
        padding: 1rem 0.5rem;
        border-top: 1px solid #669;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.1);

        &:hover {
            outline: 1px solid #eee;
            outline-offset: -2px;
        }
    }

    .current {
        background: #f0f8ff;
        color: #234;
    }

    .user {
        display: flex;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .avatar {
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        margin-right: 0.5rem;
    }

    .id {
        font-size: 0.8rem;
        color: #999;
        margin-left: 0.5rem;
    }

    button {
        padding: 0 0.75rem;
        border: none;
        cursor: pointer;
        border-radius: 0;
        background: #eee;
        color: #234;
        font-size: 1rem;
        border: none;
        cursor: pointer;
    }
</style>
