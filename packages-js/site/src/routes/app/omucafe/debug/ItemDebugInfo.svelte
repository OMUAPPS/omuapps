<script lang="ts">
    import { getContext } from '../game/game.js';
    import type { ItemState } from '../item/item-state.js';

    export let item: ItemState;
    let open = false;

</script>

<div class="item-debug-info">
    <button onclick={() => open = !open}>
        {item.id}
    </button>
    {#if open}
        <div class="children">
            {#each Object.values(item.children) as child, i (i)}
                <svelte:self item={getContext().items[child]} />
            {/each}
        </div>
        <pre>{JSON.stringify(item, null, 2)}</pre>
    {/if}
</div>
