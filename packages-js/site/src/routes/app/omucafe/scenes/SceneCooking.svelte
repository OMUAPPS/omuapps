<script lang="ts">
    import OrderList from '../components/OrderList.svelte';
    import { mouse } from '../game/game.js';
    import { getGame, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    $: console.log('SceneCooking', context);
    
    const { scene } = getGame();

    $: if (context.active) {
        mouse.ui = false;
    }
</script>

<svelte:window on:keydown={(event) => {
    if (!context.active) return;
    if (event.key === 'Escape') {
        $scene = { type: 'main_menu' };
    }
}} />
<OrderList />
