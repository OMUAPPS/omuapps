<script lang="ts">
    import BackButton from '../components/BackButton.svelte';
    import EffectEdit from '../components/EffectEdit.svelte';
    import { getGame, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    $: console.log('effect_edit', context);
    
    const { scene, config } = getGame();
</script>

{#if $scene.type === 'effect_edit'}
    {@const id = $scene.id}
    <EffectEdit bind:effect={$config.effects[id]} />
{/if}
<BackButton to={{
    type: 'product_list',
}} />
