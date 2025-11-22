<script lang="ts">
    import { run } from 'svelte/legacy';

    import BackButton from '../components/BackButton.svelte';
    import { getGame } from '../omucafe-app.js';
    import type { SceneContext } from '../scenes/scene.js';
    import ScriptEdit from './EditScript.svelte';

    interface Props {
        context: SceneContext;
    }

    let { context }: Props = $props();
    run(() => {
        console.log('SceneScriptEdit', context);
    });

    const { scene, gameConfig: config } = getGame();
</script>

{#if $scene.type === 'script_edit'}
    {@const id = $scene.id}
    {#if $config.scripts[id]}
        <ScriptEdit bind:script={$config.scripts[id]} />
    {:else}
        <div class="error">
            <h2>アイテムが見つかりません</h2>
            <p>アイテムID: {id}</p>
        </div>
    {/if}
{/if}
<BackButton to={{
    type: 'product_list',
}} active={context.active} />
