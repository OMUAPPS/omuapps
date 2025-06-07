<script lang="ts">
    import type { TypedComponent } from '@omujs/ui';
    import KitchenRenderer from './components/KitchenRenderer.svelte';
    import { getContext, markChanged, mouse } from './game/game.js';
    import { Time } from './game/time.js';
    import { DEFAULT_CONFIG, DEFAULT_GAME_CONFIG, DEFAULT_STATES, getGame, PaintBuffer, type Scene, type SceneContext } from './omucafe-app.js';
    import SceneCooking from './scenes/SceneCooking.svelte';
    import SceneEffectEdit from './scenes/SceneEffectEdit.svelte';
    import SceneInstall from './scenes/SceneInstall.svelte';
    import SceneItemEdit from './scenes/SceneItemEdit.svelte';
    import SceneLoading from './scenes/SceneLoading.svelte';
    import SceneMainMenu from './scenes/SceneMainMenu.svelte';
    import ScenePhotoMode from './scenes/ScenePhotoMode.svelte';
    import SceneProductEdit from './scenes/SceneProductEdit.svelte';
    import SceneProductList from './scenes/SceneProductList.svelte';

    const { scene, config, gameConfig, states, paintEvents } = getGame();

    const SCENES: Record<Scene['type'], TypedComponent<{
        context: SceneContext;
    }>> = {
        'loading': SceneLoading,
        'install': SceneInstall,
        'main_menu': SceneMainMenu,
        'photo_mode': ScenePhotoMode,
        'cooking': SceneCooking,
        'product_list': SceneProductList,
        'product_edit': SceneProductEdit,
        'item_edit': SceneItemEdit,
        'effect_edit': SceneEffectEdit,
    }
    let lastScene: {type: string, comp: TypedComponent<{
        context: SceneContext;
    }>} = {type: $scene.type, comp: SCENES[$scene.type]};
    let currentScene: {type: string, comp: TypedComponent<{
        context: SceneContext;
    }>} = { type: $scene.type, comp: SCENES[$scene.type] };
    $: {
        if ($scene.type !== currentScene.type) {
            lastScene = currentScene;
            currentScene = {
                type: $scene.type,
                comp: SCENES[$scene.type]
            };
        }
    }

    let sceneElement: HTMLElement;

    $: {
        mouse.ui = false;
        if (sceneElement) {
            const children = sceneElement.children;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (child instanceof HTMLElement) {
                    child.addEventListener('mouseenter', () => {
                        mouse.ui = true;
                    });
                    child.addEventListener('mouseleave', () => {
                        mouse.ui = false;
                    });
                }
            }
        }
    }
</script>

<main class:hide-cursor={!$states.kitchen.mouse.ui}>
    <KitchenRenderer side="client" />
    {#if lastScene !== currentScene}
        {#key lastScene.type}
            <div class="scene last" tabindex="-1">
                <svelte:component this={lastScene.comp} context={{
                    time: Time.get(),
                    active: false,
                }} />
            </div>
        {/key}
    {/if}
    {#key lastScene.type}
        <div class="scene current" bind:this={sceneElement}>
            <svelte:component this={SCENES[$scene.type]} context={{
                time: Time.get(),
                active: true,
            }} />
        </div>
    {/key}
</main>
<div class="debug">
    <button on:click={() => {
        $scene = { type: 'loading' };
        $config = DEFAULT_CONFIG;
        $gameConfig = DEFAULT_GAME_CONFIG;
        $states = DEFAULT_STATES;
        $paintEvents = PaintBuffer.NONE;
        markChanged();
    }}>
        reset
    </button>
    <button on:click={() => {
        window.location.reload();
    }}>
        reload
    </button>
    <button on:click={() => {
        const ctx = getContext();
        ctx.order = {
            id: '0',
            items: [],
            status: {
                type: 'waiting',
            },
            user: {
                id: 'testid',
                name: 'testsan',
                avatar: 'https://pbs.twimg.com/profile_images/1907814203936878593/IoIESuNu_400x400.jpg',
            }
        }
    }}>
        set order
    </button>
</div>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        overflow: hidden;
    }

    .hide-cursor {
        cursor: none;
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

        &.current {
            animation: fadeIn 0.0621s ease-in;
            animation-fill-mode: forwards;
        }

        &.last {
            animation: fadeOut 0.1621s ease-out;
            animation-fill-mode: forwards;
        }
    }

    @keyframes fadeIn {
        0% {
            opacity: 0.8;
            transform: translateX(-1rem);
        }
        50% {
            opacity: 1;
            transform: translateX(0.1rem);
        }
        100% {
            opacity: 1;
            transform: translateX(0);
        }
    }

    @keyframes fadeOut {
        0% {
            opacity: 1;
        }
        20% {
            opacity: 0.1;
            transform: translateX(0.8rem);
        }
        100% {
            opacity: 0;
            transform: translateX(1rem);
        }
    }
</style>
