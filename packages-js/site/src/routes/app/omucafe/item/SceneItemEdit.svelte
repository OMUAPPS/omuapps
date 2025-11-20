<script lang="ts">
    import { run } from 'svelte/legacy';

    import BackButton from '../components/BackButton.svelte';
    import { getGame } from '../omucafe-app.js';
    import type { SceneContext } from '../scenes/scene.js';
    import EditItem from './EditItem.svelte';

    interface Props {
        context: SceneContext;
    }

    let { context }: Props = $props();
    run(() => {
        console.log('SceneItemEdit', context);
    });

    const { scene, gameConfig: config } = getGame();
</script>

{#if $scene.type === 'item_edit'}
    {@const id = $scene.id}
    {#if $config.items[id]}
        <EditItem bind:item={$config.items[id]} />
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
