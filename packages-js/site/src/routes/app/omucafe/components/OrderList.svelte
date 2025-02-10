<script lang="ts">
    import { TableList } from '@omujs/ui';
    import { getGame } from '../omucafe-app.js';
    import OrderListItem from './OrderListItem.svelte';
    
    const { orders } = getGame();
</script>

<div class="order-list">
    <TableList table={orders} component={OrderListItem}/>
</div>

<style lang="scss">
    .order-list {
        position: absolute;
        right: 10%;
        padding: 0.5%;
        padding-top: 2%;
        display: flex;
        flex-direction: column-reverse;
        background: #234;
        color: #eee;
        width: 20rem;
        height: 30%;
        font-family: "DotGothic16", serif;
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
