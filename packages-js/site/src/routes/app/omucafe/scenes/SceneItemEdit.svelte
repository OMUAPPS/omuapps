<script lang="ts">
    import BackButton from '../components/BackButton.svelte';
    import ItemEdit from '../components/ItemEdit.svelte';
    import { getGame, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    $: console.log('SceneItemEdit', context);
    
    const { scene, config } = getGame();
</script>

{#if $scene.type === 'item_edit'}
    {@const id = $scene.id}
    <ItemEdit bind:item={$config.items[id]} />
{/if}
<BackButton to={{
    type: 'product_list',
}} />
