<script lang="ts">
    import ItemDebugInfo from './ItemDebugInfo.svelte';
    import { getContext } from '../game/game.js';
    import type { ItemState } from '../item/item-state.js';

    interface Props {
        item: ItemState;
    }

    let { item }: Props = $props();
    let open = $state(false);

</script>

<div class="item-debug-info">
    <button onclick={() => open = !open}>
        {item.id}
    </button>
    {#if open}
        <div class="children">
            {#each Object.values(item.children) as child, i (i)}
                <ItemDebugInfo item={getContext().items[child]} />
            {/each}
        </div>
        <pre>{JSON.stringify(item, null, 2)}</pre>
    {/if}
</div>
