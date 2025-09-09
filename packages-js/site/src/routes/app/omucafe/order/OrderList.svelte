<script lang="ts">
    import { TableList } from '@omujs/ui';
    import { getGame } from '../omucafe-app.js';
    import OrderListEntry from './OrderListEntry.svelte';

    const { orders } = getGame();
</script>

<div class="order-list">
    <TableList table={orders} component={OrderListEntry} backward sort={(a, b) => {
        return a.timestamp - b.timestamp;
    }} />
</div>

<style lang="scss">
    .order-list {
        position: absolute;
        left: 4rem;
        top: 0;
        display: flex;
        flex-direction: column-reverse;
        background: #234;
        color: #eee;
        width: 20rem;
        height: 30%;
        font-weight: 600;
        font-style: normal;
        overflow-y: auto;

        &::-webkit-scrollbar {
            width: 8px;
        }

        &::-webkit-scrollbar-track {
            background: #234;
            border-radius: 1px;
        }

        &::-webkit-scrollbar-thumb {
            background: #eee;
            border: 1px solid #234;
            border-radius: 1px;
        }

        @supports not selector(::-webkit-scrollbar) {
            & {
                scrollbar-color: var(--color-1) var(--color-bg-2);
            }
        }
    }
</style>
