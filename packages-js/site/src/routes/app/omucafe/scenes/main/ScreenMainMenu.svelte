<script lang="ts">
    import Ticker from '$lib/components/Ticker.svelte';
    import type { SceneJson, SourceJson } from '@omujs/obs/types.js';
    import { App, BrowserSession } from '@omujs/omu';
    import { obs, omu, Spinner } from '@omujs/ui';
    import { fly } from 'svelte/transition';
    import { OMUCAFE_BACKGROUND_APP, OMUCAFE_OVERLAY_APP } from '../../app';
    import type { Game } from '../../core/game';
    import BusinessRegistration from './components/BusinessRegistration.svelte';
    import SourceList from './components/SourceList.svelte';
    import setup_avatar_background from './img/setup_avatar_background.png';
    import setup_avatar_overlay from './img/setup_avatar_overlay.png';
    import type { SceneMainMenuData } from './mainmenu';

    interface Props {
        scene: SceneMainMenuData;
        game: Game;
    }

    let { scene, game }: Props = $props();

    if (!scene.task) {
        scene.task = { type: 'setup' };
    }

    const STEPS: typeof scene.task[] = [
        { type: 'omucafe' },
        { type: 'avatar' },
        { type: 'overlay' },
        { type: 'setup' },
    ];
    const STEP_NAMES: Record<typeof scene.task.type, string> = {
        omucafe: '配信喫茶',
        avatar: 'アバターの設定',
        overlay: 'カフェの設定',
        setup: '開業届',
        obs_waiting: 'OBSを待っています',
    };

    async function getScene(): Promise<SceneJson> {
        const config = game.states.config.value;
        if (config.obs) {
            try {
                const scene = await $obs.sceneGetByUuid(config.obs.scene_uuid);
                if (scene) {
                    return scene;
                }
            } catch (e) {
                console.error(e);
            }
        }

        try {
            const scene = await $obs.sceneGetByName('omucafe');
            if (scene) {
                config.obs = {
                    scene_uuid: scene.uuid,
                };
                return scene;
            }
        } catch (e) {
            console.error(e);
        }

        const resp = await $obs.sceneCreate({
            name: 'omucafe',
        });
        config.obs = {
            scene_uuid: resp.scene.uuid,
        };
        return resp.scene;
    }

    async function ensureSource(scene: SceneJson, generate: () => Promise<URL>, name: string, uuid?: string): Promise<SourceJson> {
        if (uuid) {
            try {
                const source = await $obs.sourceGetByUuid({ uuid, scene: scene.name });
                if (source) {
                    return source;
                }
            } catch (e) {
                console.error(e);
            }
        }
        try {
            const source = await $obs.sourceGetByName({ name, scene: scene.name });
            if (source) {
                return source;
            }
        } catch (e) {
            console.error(e);
        }
        const url = await generate();
        const result = await $obs.browserAdd({
            name,
            url: url.toString(),
            width: 1080,
            height: 1920,
            blend_properties: {
                blending_method: 'SRGB_OFF',
                blending_mode: 'NORMAL',
            },
            scene: scene.name,
        });
        return result.source;
    }

    async function generateSession(app: App) {
        if (!app.url) throw new Error('App url not set');
        const session = await $omu.sessions.generateToken({
            app,
            permissions: [],
        });
        const url = new URL(app.url);
        url.searchParams.set(BrowserSession.PARAM_NAME, JSON.stringify(session));
        return url;
    }

    async function update(task: typeof scene.task) {
        if (!task) {
            return;
        }
        if (task.type === 'avatar') {
            const obsScene = await getScene();
            const obs = game.states.config.value.obs ??= { scene_uuid: (obsScene).uuid };
            const background = await ensureSource(obsScene, () => generateSession(OMUCAFE_BACKGROUND_APP), '背景', obs.background_uuid);
            obs.background_uuid = background.uuid;
        }
        if (task.type === 'overlay') {
            const obsScene = await getScene();
            const obs = game.states.config.value.obs ??= { scene_uuid: (await obsScene).uuid };
            const overlay = await ensureSource(obsScene, () => generateSession(OMUCAFE_OVERLAY_APP), 'オーバーレイ', obs.overlay_uuid);
            obs.overlay_uuid = overlay.uuid;
        }
    }

    $effect(() => {
        const { task } = scene;
        update(task);
    });

    let obsConnected = $state(false);
    if ($obs) {
        obsConnected = $obs.isConnected();
        $obs.on('connected', () => {
            obsConnected = true;
        });
        $obs.on('disconnected', () => {
            obsConnected = false;
        });

        $effect(() => {
            if (!obsConnected) {
                scene.task = {
                    type: 'obs_waiting',
                };
            } else if (scene.task?.type === 'obs_waiting') {
                scene.task = {
                    type: 'omucafe',
                };
            }
        });
    }
</script>

{#snippet breadcrumbs()}
    {@const { task } = scene}
    {#if task}
        {@const currentIndex = STEPS.findIndex((step) => step.type === task.type)}
        {@const prev = STEPS[currentIndex - 1]}
        {@const next = STEPS[currentIndex + 1]}
        <div class="breadcrumbs">
            {#if prev}
                <button onclick={() => {
                    scene.task = prev;
                }}>
                    <p>
                        前へ
                        <i class="ti ti-chevron-left"></i>
                    </p>
                    <small>{STEP_NAMES[prev.type]}</small>
                </button>
            {:else}
                <button onclick={() => {
                }} disabled>
                    前へ
                </button>
            {/if}
            {#if next}
                <button onclick={() => {
                    scene.task = next;
                }}>
                    <p>
                        次へ
                        <i class="ti ti-chevron-right"></i>
                    </p>
                    <small>{STEP_NAMES[next.type]}</small>
                </button>
            {:else}
                <button onclick={() => {
                    game.startTransition({
                        type: 'kitchen',
                    });
                }}>
                    <p>
                        店を開く
                        <i class="ti ti-chevron-right"></i>
                    </p>
                </button>
            {/if}
        </div>
    {/if}
{/snippet}
<main>
    {#if !scene.task}
        <Spinner />
    {:else if scene.task.type === 'omucafe'}
        {#if game.app.side === 'client'}
            <div class="task">
                <h1>これから自分の<strong>配信喫茶</strong>を作りましょう</h1>
                <p>OBS上の設定と、お店の準備をします</p>
            </div>
        {/if}
    {:else if scene.task.type === 'avatar'}
        <div class="task" in:fly={{ y: 4, duration: 250, opacity: 1 }}>
            {#if game.side === 'client'}
                <h1>あなたを追加しましょう</h1>
                <small>「背景」の上に、あなたを配置します</small>
                <div class="obs">
                    <Ticker offset={250} interval={1000}>
                        {#snippet children(tick)}
                            <SourceList title="ソース" items={((tick + 3) % 4) < 3 ? [
                                {
                                    name: [
                                        'あなた',
                                        'Spout2 Capture 2',
                                        'ウィンドウキャプチャー',
                                    ][(tick + 3) % 4],
                                    selected: true,
                                    cursor: true,
                                    icon: 'ti-user',
                                },
                                {
                                    name: '背景',
                                    selected: false,
                                },
                            ] : [
                                {
                                    name: '背景',
                                    selected: false,
                                },
                            ]} scale={1} />
                        {/snippet}
                    </Ticker>
                </div>
            {:else if game.side === 'background'}
                <div class="overlay background">
                    <img src={setup_avatar_background} alt="" width="1080" height="1920" />
                </div>
            {/if}
        </div>
    {:else if scene.task.type === 'overlay'}
        <div class="task" in:fly={{ y: 4, duration: 250, opacity: 1 }}>
            {#if game.app.side === 'client'}
                <h1>この順番になっていますか？</h1>
                <div class="obs">
                    <SourceList title="ソース" items={[
                        {
                            name: 'オーバーレイ',
                            selected: false,
                        },
                        {
                            name: 'あなた',
                            selected: true,
                            cursor: true,
                            icon: 'ti-user',
                        },
                        {
                            name: '背景',
                            selected: false,
                        },
                    ]} scale={1} />
                </div>
            {:else if game.side === 'background'}
                <div class="overlay background">
                    <img src={setup_avatar_background} alt="" width="1080" height="1920" />
                </div>
            {:else if game.side === 'overlay'}
                <div class="overlay">
                    <img src={setup_avatar_overlay} alt="" width="1080" height="1920" />
                </div>
            {/if}
        </div>
    {:else if scene.task.type === 'setup'}
        {#if game.side === 'client'}
            <BusinessRegistration />
        {:else if game.side === 'background'}
            <div class="overlay background">
            </div>
        {/if}
    {/if}
    {#if game.side === 'client'}
        {@render breadcrumbs()}
    {/if}
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-direction: column;
        margin: auto;
        top: unset;
        height: min(60rem, 100% - 10rem);
        flex: 1;
        gap: 2rem;
    }

    h1 {
        font-size: 1.9rem;
        color: var(--color-1);
        border-bottom: 2px solid var(--color-1);
        width: fit-content;
        text-align: center;
    }

    strong {
        font-size: 2rem;
        margin: 0 0.5rem;
    }

    .task {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        flex-direction: column;
        gap: 4rem;
        flex: 1;
    }

    .obs {
        flex: 1;
        padding: 0 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .breadcrumbs {
        display: flex;
        gap: 2rem;
        padding-top: 4rem;
        padding-bottom: 10rem;
        width: 30rem;
        justify-content: space-between;

        > button {
            padding: 1rem 3rem;
            border: none;
            font-weight: 600;
            background: var(--color-1);
            color: var(--color-bg-2);
            border-radius: 4px;
            cursor: pointer;
            min-width: 10rem;

            &:disabled {
                background: var(--color-bg-2);
                color: var(--color-outline);
                cursor: unset;
            }
        }
    }

    .overlay {
        position: fixed;
        inset: 0;
        font-size: 200px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .background {
        background: var(--color-bg-1);
    }
</style>
