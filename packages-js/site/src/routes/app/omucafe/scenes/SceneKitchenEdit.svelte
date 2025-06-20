<script lang="ts">
    import OrderList from '../components/OrderList.svelte';
    import { getGame, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    $: console.log('SceneKitchenEdit', context);
    
    const { scene } = getGame();
</script>

<svelte:window on:keydown={(event) => {
    if (!context.active) return;
    if (event.key === 'Escape') {
        $scene = { type: 'main_menu' };
    }
}} />
<OrderList />
