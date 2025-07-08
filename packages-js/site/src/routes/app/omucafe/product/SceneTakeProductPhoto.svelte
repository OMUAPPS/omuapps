<script lang="ts">
    import BackButton from '../components/BackButton.svelte';
    import { getGame } from '../omucafe-app.js';
    import type { SceneContext } from '../scenes/scene.js';

    export let context: SceneContext;
    $: console.log('SceneProductEdit', context);

    const { scene, gameConfig: config } = getGame();
</script>

<main>
    {#if $scene.type === 'product_take_photo'}
        {@const id = $scene.id}
        <h1>カウンターにアイテムを置いて写真を取ります</h1>
    {/if}
</main>
<BackButton to={{type: 'product_list'}} active={context.active}/>

<style lang="scss">
    main {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        padding-top: 4rem;
        padding-bottom: 6rem;
        color: var(--color-1);
        display: flex;
        justify-content: center;
        gap: 1rem;
        background: linear-gradient(to top, transparent 0%, var(--color-bg-2) 100%);
    }

    h1 {
        border-bottom: 1px solid var(--color-1);
        padding-bottom: 0.5rem;
    }
</style>
