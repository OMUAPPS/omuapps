<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import type { TypedComponent } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { onMount } from 'svelte';
    import { APP } from './app.js';
    import KitchenRenderer from './components/KitchenRenderer.svelte';
    import { createGame, DEFAULT_CONFIG, DEFAULT_STATES, getGame, type Scene, type SceneContext } from './omucafe-app.js';
    import SceneCooking from './scenes/SceneCooking.svelte';
    import SceneEffectEdit from './scenes/SceneEffectEdit.svelte';
    import SceneItemEdit from './scenes/SceneItemEdit.svelte';
    import SceneLoading from './scenes/SceneLoading.svelte';
    import SceneMainMenu from './scenes/SceneMainMenu.svelte';
    import ScenePhotoMode from './scenes/ScenePhotoMode.svelte';
    import SceneProductEdit from './scenes/SceneProductEdit.svelte';
    import SceneProductList from './scenes/SceneProductList.svelte';
    import { getWorker } from './worker/game-worker.js';

    createGame(APP);
    const { scene, config, states, orders } = getGame();

    const SCENES: Record<Scene['type'], TypedComponent<{
        context: SceneContext;
    }>> = {
        'loading': SceneLoading,
        'main_menu': SceneMainMenu,
        'photo_mode': ScenePhotoMode,
        'cooking': SceneCooking,
        'product_list': SceneProductList,
        'product_edit': SceneProductEdit,
        'item_edit': SceneItemEdit,
        'effect_edit': SceneEffectEdit,
    }

    if (BROWSER) {
        onMount(async () => {
            const worker = await getWorker();
            const tokens = await worker.call('tokenize', 'すもももももももものうち');
            console.log(tokens);
        });
    }
</script>

<AppPage />
<main>
    <KitchenRenderer />
    <div class="scene">
        <svelte:component this={SCENES[$scene.type]} context={{
            time: performance.now(),
        }} />
    </div>
</main>
<div class="debug">
    <button on:click={async () => {
        let minId = 1;
        for await (const order of orders.iterate({})) {
            if (order.id >= minId) {
                minId = order.id + 1;
            }
        }
        await orders.add({
            id: minId,
            user: {
                id: 'guest',
                name: 'ゲスト',
            },
            status: {
                type: 'waiting',
            },
        });
    }}>
        オーダーを追加
    </button>
    <button on:click={() => {
        $scene = { type: 'loading' };
        $config = DEFAULT_CONFIG;
        $states = DEFAULT_STATES;
    }}>
        reset
    </button>
    <button on:click={() => {
        window.location.reload();
    }}>
        reload
    </button>
</div>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
    }

    .debug {
        position: absolute;
        bottom: 1rem;
        left: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1px;
        font-size: 0.7rem;
        opacity: 0.2;
        pointer-events: none;

        > button {
            width: fit-content;
            pointer-events: auto;
        }
    }

    .scene {
        position: absolute;
        inset: 0;
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>
