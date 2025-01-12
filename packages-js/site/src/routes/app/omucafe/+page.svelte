<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import type { TypedComponent } from '@omujs/ui';
    import { DEFAULT_CONFIG, DEFAULT_STATES, game, type Scene, type SceneContext } from './omucafe-app.js';
    import SceneCooking from './scenes/SceneCooking.svelte';
    import SceneIngredientEdit from './scenes/SceneIngredientEdit.svelte';
    import SceneLoading from './scenes/SceneLoading.svelte';
    import SceneMainMenu from './scenes/SceneMainMenu.svelte';
    import ScenePhotoMode from './scenes/ScenePhotoMode.svelte';
    import SceneProductEdit from './scenes/SceneProductEdit.svelte';
    import SceneProductList from './scenes/SceneProductList.svelte';

    const { scene, config, states, orders } = game;

    const SCENES: Record<Scene['type'], TypedComponent<{
        context: SceneContext;
    }>> = {
        'loading': SceneLoading,
        'main_menu': SceneMainMenu,
        'photo_mode': ScenePhotoMode,
        'cooking': SceneCooking,
        'product_list': SceneProductList,
        'product_edit': SceneProductEdit,
        'ingredient_edit': SceneIngredientEdit,
    }
</script>

<AppPage />
<main>
    <svelte:component this={SCENES[$scene.type]} context={{
        time: performance.now(),
    }} />
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
</style>
