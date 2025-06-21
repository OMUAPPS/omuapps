<script lang="ts">
    import BackButton from '../components/BackButton.svelte';
    import ItemEdit from '../components/ItemEdit.svelte';
    import { getGame, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    $: console.log('SceneItemEdit', context);
    
    const { scene, gameConfig: config } = getGame();
</script>

{#if $scene.type === 'item_edit'}
    {@const id = $scene.id}
    {#if $config.items[id]}
        <ItemEdit bind:item={$config.items[id]} created={$scene.created} />
    {:else}
        <div class="error">
            <h2>アイテムが見つかりません</h2>
            <p>アイテムID: {id}</p>
        </div>
    {/if}
{/if}
<BackButton to={{
    type: 'product_list',
}} active={context.active}/>
