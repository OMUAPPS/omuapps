<script lang="ts">
    import BackButton from '../components/BackButton.svelte';
    import EffectEdit from '../components/EffectEdit.svelte';
    import { getGame, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    
    const { scene, gameConfig: config } = getGame();
</script>

{#if $scene.type === 'effect_edit'}
    {@const id = $scene.id}
    {#if $config.effects[id]}
        <EffectEdit bind:effect={$config.effects[id]} />
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
