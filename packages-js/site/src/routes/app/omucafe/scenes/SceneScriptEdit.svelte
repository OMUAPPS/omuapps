<script lang="ts">
    import BackButton from '../components/BackButton.svelte';
    import ScriptEdit from '../components/scriptedit/ScriptEdit.svelte';
    import { getGame, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    $: console.log('SceneScriptEdit', context);
    
    const { scene, gameConfig: config } = getGame();
</script>

{#if $scene.type === 'script_edit'}
    {@const id = $scene.id}
    <ScriptEdit bind:script={$config.scripts[id]} />
{/if}
<BackButton to={{
    type: 'product_list',
}} active={context.active}/>
