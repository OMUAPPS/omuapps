<script lang="ts">
    import { run } from 'svelte/legacy';

    import ChatRenderer from '../components/ChatRenderer.svelte';
    import { mouse } from '../game/game.js';
    import { getGame } from '../omucafe-app.js';
    import OrderList from '../order/OrderList.svelte';
    import type { SceneContext } from '../scenes/scene.js';

    interface Props {
        context: SceneContext;
    }

    let { context }: Props = $props();
    run(() => {
        console.log('SceneCooking', context);
    });

    const { scene } = getGame();

    run(() => {
        if (context.active) {
            mouse.ui = false;
        }
    });
</script>

<svelte:window onkeydown={(event) => {
    if (!context.active) return;
    if (event.key === 'Escape') {
        $scene = { type: 'main_menu' };
    }
}} />
<OrderList />
<ChatRenderer />
