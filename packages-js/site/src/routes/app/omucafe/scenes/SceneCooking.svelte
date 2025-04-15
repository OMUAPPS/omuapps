<script lang="ts">
    import BackButton from '../components/BackButton.svelte';
    import { getGame, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    $: console.log('SceneCooking', context);
    
    const { scene } = getGame();
</script>

<svelte:window on:keydown={(event) => {
    if (!context.current) return;
    if (event.key === 'Escape') {
        $scene = { type: 'main_menu' };
    }
}} />
<BackButton />
