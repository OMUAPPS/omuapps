<script lang="ts">
    import { getGame, type Order } from '../omucafe-app.js';

    const { orders } = getGame();
    
    export let entry: Order;
    export let selected: boolean = false;
</script>

<div class="order" class:selected>
    <div>
        {entry.id}番
        {entry.user.name}
    </div>
    {#if entry.status.type === 'waiting'}
        <button on:click={() => {
            entry.status.type = 'cooking';
        }}>
            料理開始
        </button>
    {/if}
    {#if entry.status.type === 'cooking'}
        <button on:click={() => {
            entry.status.type = 'done';
        }}>
            完了
        </button>
    {/if}
    {#if entry.status.type === 'done'}
        <button on:click={async () => {
            await orders.remove(entry);
        }}>
            削除
        </button>
    {/if}
</div>

<style lang="scss">
    .order {
        padding: 0.5rem;
        border-top: 1px solid #669;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.1);

        &:hover {
            background: #eee;
            color: #234;
        }
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
