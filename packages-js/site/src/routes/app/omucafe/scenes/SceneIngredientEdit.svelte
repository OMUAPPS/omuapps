<script lang="ts">
    import BackButton from '../components/BackButton.svelte';
    import IngredientEdit from '../components/IngredientEdit.svelte';
    import { game, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    $: console.log('SceneIngredientEdit', context);
    
    const { scene, config } = game;
</script>

{#if $scene.type === 'ingredient_edit'}
    {@const id = $scene.id}
    <IngredientEdit bind:ingredient={$config.ingredients[id]} />
{/if}
<BackButton to={{
    type: 'product_list',
}} />
