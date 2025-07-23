<script lang="ts">
    import BackButton from '../components/BackButton.svelte';
    import { getGame } from '../omucafe-app.js';
    import type { SceneContext } from '../scenes/scene.js';
    import EditProduct from './EditProduct.svelte';

    export let context: SceneContext;
    $: console.log('SceneProductEdit', context);

    const { scene, gameConfig: config } = getGame();
</script>

<main>
    {#if $scene.type === 'product_edit'}
        {@const id = $scene.id}
        <EditProduct bind:product={$config.products[id]}/>
    {/if}
</main>
<BackButton to={{type: 'product_list'}} active={context.active}/>

<style lang="scss">
    main {
        position: absolute;
        inset: 10%;
        background: var(--color-bg-2);
        color: var(--color-1);
        display: flex;
        gap: 1rem;
        outline: 1px solid var(--color-outline);
    }
</style>
