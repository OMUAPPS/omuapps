<script lang="ts">
    import { getGame, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    $: console.log('SceneCooking', context);
    
    const { scene } = getGame();
</script>

<svelte:window on:keydown={(event) => {
    if (!context.active) return;
    if (event.key === 'Escape') {
        $scene = { type: 'main_menu' };
    }
}} />
