<script lang="ts">
    import { run } from 'svelte/legacy';

    import type { DragDropFile } from '@omujs/omu/api/dashboard';
    import type { TypedComponent } from '@omujs/ui';
    import { Spinner } from '@omujs/ui';
    import KitchenRenderer from './components/KitchenRenderer.svelte';
    import SceneEffectEdit from './effect/SceneEffectEdit.svelte';
    import SceneGallery from './gallery/SceneGallery.svelte';
    import { DEFAULT_CONFIG } from './game/config.js';
    import { getContext, markChanged, mouse } from './game/game.js';
    import { GameData } from './game/gamedata.js';
    import { PaintBuffer } from './game/paint.js';
    import { Time } from './game/time.js';
    import SceneItemEdit from './item/SceneItemEdit.svelte';
    import SceneKitchen from './kitchen/SceneKitchen.svelte';
    import SceneKitchenEdit from './kitchen/SceneKitchenEdit.svelte';
    import {
        DEFAULT_GAME_CONFIG,
        DEFAULT_STATES,
        getGame,
    } from './omucafe-app.js';
    import SceneProductEdit from './product/SceneProductEdit.svelte';
    import SceneProductList from './product/SceneProductList.svelte';
    import SceneTakeProductPhoto from './product/SceneTakeProductPhoto.svelte';
    import SceneInstall from './scenes/SceneInstall.svelte';
    import SceneLoading from './scenes/SceneLoading.svelte';
    import SceneMainMenu from './scenes/SceneMainMenu.svelte';
    import ScenePhotoMode from './scenes/ScenePhotoMode.svelte';
    import { type Scene, type SceneContext } from './scenes/scene.js';
    import SceneScriptEdit from './script/SceneScriptEdit.svelte';

    export const SCENES: Record<
        Scene['type'],
        TypedComponent<{
            context: SceneContext;
        }>
    > = {
        loading: SceneLoading,
        install: SceneInstall,
        main_menu: SceneMainMenu,
        photo_mode: ScenePhotoMode,
        kitchen: SceneKitchen,
        kitchen_edit: SceneKitchenEdit,
        product_list: SceneProductList,
        product_edit: SceneProductEdit,
        product_take_photo: SceneTakeProductPhoto,
        item_edit: SceneItemEdit,
        effect_edit: SceneEffectEdit,
        script_edit: SceneScriptEdit,
        gallery: SceneGallery,
    };

    const { omu, scene, config, gameConfig, orders, states, paintEvents } =
        getGame();

    let lastScene: {
        type: string;
        comp: TypedComponent<{
            context: SceneContext;
        }>;
    } = $state({ type: $scene.type, comp: SCENES[$scene.type] });
    let currentScene: {
        type: string;
        comp: TypedComponent<{
            context: SceneContext;
        }>;
    } = $state({ type: $scene.type, comp: SCENES[$scene.type] });
    run(() => {
        if ($scene.type !== currentScene.type) {
            lastScene = currentScene;
            currentScene = {
                type: $scene.type,
                comp: SCENES[$scene.type],
            };
        }
    });

    let sceneElement: HTMLElement = $state();

    run(() => {
        mouse.ui = false;
        if (sceneElement) {
            mouse.ui = (
                ['main_menu', 'install'] as (typeof $scene.type)[]
            ).includes($scene.type);
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
            sceneElement.focus({ preventScroll: true });
        }
    });

    let importState:
        | {
            type: 'drag-enter';
            drag_id: string;
            files: DragDropFile[];
        }
        | {
            type: 'loading';
        }
        | {
            type: 'failed';
        }
        | {
            type: 'loaded';
        }
        | null = $state(null);

    omu.dashboard.requestDragDrop().then((handler) => {
        handler.onEnter(async ({ drag_id, files }) => {
            if (!files.some((it) => it.name.endsWith('.omucafe'))) return;
            importState = {
                type: 'drag-enter',
                drag_id,
                files,
            };
            console.log('enter', drag_id);
        });
        handler.onLeave(({ drag_id }) => {
            console.log('leave', drag_id);
            importState = null;
        });
        handler.onDrop(async ({ drag_id, files }) => {
            if (!files.some((it) => it.name.endsWith('.omucafe'))) return;
            console.log('drop', drag_id);
            importState = {
                type: 'loading',
            };
            try {
                const resp = await handler.read(drag_id);
                const datas: GameData[] = [];
                for (const { file, buffer } of Object.values(resp.files)) {
                    if (!file.name.endsWith('.omucafe')) continue;
                    const gameData = GameData.deserialize(buffer);
                    datas.push(gameData);
                    await gameData.load();
                }
                importState = {
                    type: 'loaded',
                };
            } catch {
                importState = {
                    type: 'failed',
                };
            }
            setTimeout(() => {
                importState = null;
            }, 1000);
        });
    });

    const SvelteComponent = $derived(SCENES[$scene.type]);
</script>

<main class:hide-cursor={!$states.kitchen.mouse.ui}>
    <KitchenRenderer side="client" />
    {#if lastScene !== currentScene}
        {#key lastScene.type}
            <div class="scene last" tabindex="-1">
                <lastScene.comp
                    context={{
                        time: Time.now(),
                        active: false,
                    }}
                />
            </div>
        {/key}
    {/if}
    {#key lastScene.type}
        <div class="scene current" bind:this={sceneElement}>
            <SvelteComponent
                context={{
                    time: Time.now(),
                    active: true,
                }}
            />
        </div>
    {/key}
</main>
<div class="debug">
    <button
        onclick={() => {
            $scene = { type: 'loading' };
            $config = DEFAULT_CONFIG;
            $gameConfig = DEFAULT_GAME_CONFIG;
            $states = DEFAULT_STATES;
            $paintEvents = PaintBuffer.EMPTY;
            orders.clear();
            markChanged();
        }}
    >
        reset
    </button>
    <button
        onclick={() => {
            window.location.reload();
        }}
    >
        reload
    </button>
    <button
        onclick={() => {
            const ctx = getContext();
            ctx.order = null;
        }}
    >
        set order
    </button>
</div>

<div class="overlay" class:active={importState}>
    {#if !importState}
        ...
    {:else if importState.type === 'drag-enter'}
        <span>
            <i class="ti ti-download"></i>
            ここに落として読み込み
        </span>
    {:else if importState.type === 'loading'}
        <span>
            <Spinner />
            読み込み中…
        </span>
    {:else if importState.type === 'failed'}
        <span>
            <i class="ti ti-alert-hexagon"></i>
            読み込みに失敗しました
        </span>
        無効なゲームファイル
    {:else if importState.type === 'loaded'}
        <span>
            <i class="ti ti-check"></i>
            読み込み完了
        </span>
    {/if}
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

    .overlay {
        position: fixed;
        inset: 0;
        pointer-events: none;
        visibility: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        color: var(--color-1);
        outline: 1px solid var(--color-1);
        outline-offset: -3rem;

        &.active {
            visibility: visible;
            animation: forwards overlayIn 0.2s;
        }

        > span {
            display: flex;
            align-items: baseline;
            justify-content: center;
            gap: 1rem;
            font-size: 2rem;
            animation: forwards overlayContentIn 0.2s;
        }
    }

    @keyframes overlayIn {
        0% {
            background: color-mix(in srgb, var(--color-1) 20%, transparent 0%);
            outline-offset: -2rem;
        }

        32% {
            background: color-mix(
                in srgb,
                var(--color-bg-2) 100%,
                transparent 0%
            );
            outline-offset: -3.25rem;
        }

        100% {
            background: color-mix(
                in srgb,
                var(--color-bg-1) 90%,
                transparent 0%
            );
        }
    }

    @keyframes overlayContentIn {
        0% {
            transform: translateY(-1rem);
            color: var(--color-bg-2);
            opacity: 0;
        }

        32% {
            transform: translateY(0.2621rem);
            opacity: 0.8;
            color: var(--color-1);
        }

        100% {
            color: var(--color-1);
            transform: translateY(0rem);
        }
    }

    .scene {
        position: absolute;
        inset: 0;
        display: flex;
        justify-content: center;
        align-items: center;

        &.current {
            animation: fadeIn 0.08621s ease-in;
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
        20% {
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
