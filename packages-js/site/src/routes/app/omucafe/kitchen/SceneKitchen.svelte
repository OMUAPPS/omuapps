<script lang="ts">
    import ChatRenderer from '../components/ChatRenderer.svelte';
    import { mouse } from '../game/game.js';
    import { getGame } from '../omucafe-app.js';
    import OrderList from '../order/OrderList.svelte';
    import type { SceneContext } from '../scenes/scene.js';

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
<ChatRenderer />
