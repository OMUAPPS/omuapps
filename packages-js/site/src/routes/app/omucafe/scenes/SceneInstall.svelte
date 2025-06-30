<script lang="ts">
    import { page } from '$app/stores';
    import { once } from '$lib/helper.js';
    import { tryCatch } from '$lib/result.js';
    import { Button, Spinner } from '@omujs/ui';
    import { onMount } from 'svelte';
    import avatar_setup from '../images/avatar_setup.png';
    import { getGame, isInstalled, sessions } from '../omucafe-app.js';
    import type { SceneContext } from './scene.js';

    export let context: SceneContext;
    $: console.log('SceneCooking', context);
    
    const { scene, config, obs } = getGame();

    let state: {
        type: 'waiting'
    } | {
        type: 'prompt'
    } | {
        type: 'installing'
    } | {
        type: 'setup'
    } = {
        type: 'waiting',
    };

    onMount(async () => {
        const connected = obs.isConnected();
        if (!connected) {
            await once((resolve) => obs.on('connected', resolve));
        }
        state = { type: 'prompt' };
    });

    sessions.subscribe(({ background, overlay }) => {
        if (state.type !== 'prompt' && state.type !== 'waiting') return;
        if (background && overlay) {
            $scene = { type: 'main_menu' };
        }
    });

    function getURL(name: string) {
        const url = new URL($page.url);
        url.pathname = `${url.pathname}asset/${name}`;
        return url;
    }

    const NAMES = {
        SCENE: '配信喫茶',
        BACKGROUND: 'キッチン',
        OVERLAY: 'カウンター',
    }

    async function install() {
        if (isInstalled()) {
            $scene = { type: 'main_menu' };
            return;
        }
        const sceneRes = $config.obs.scene_uuid && (await tryCatch(obs.sceneGetByUuid($config.obs.scene_uuid))).data || (await tryCatch(obs.sceneGetByName(NAMES.SCENE))).data || null;
        const scene = sceneRes ?? (await obs.sceneCreate({
            name: NAMES.SCENE,
        })).scene;
        const sources = await obs.sourceList({scene: scene.name});
        const overlayUrl = getURL('overlay');
        const backgroundUrl = getURL('background');
        console.log('sources', sources);
        for (const source of sources) {
            if (source.uuid === $config.obs.background_uuid) {
                continue;
            }
            if (source.uuid === $config.obs.overlay_uuid) {
                continue;
            }
            if (source.type !== 'browser_source') {
                continue;
            }
            if (!source.data.url) {
                continue;
            }
            const url = new URL(source.data.url);
            if (url.hostname !== location.hostname) {
                continue;
            }
            if (url.pathname === overlayUrl.pathname) {
                await obs.sourceRemoveByUuid(source.uuid!);
                continue;
            }
            if (url.pathname === backgroundUrl.pathname) {
                await obs.sourceRemoveByUuid(source.uuid!);
                continue;
            }
        }
        $config.obs.scene_uuid = scene.uuid;
        const backgroundRes = $config.obs.background_uuid && (await tryCatch(obs.sourceGetByUuid({uuid: $config.obs.background_uuid}))).data || (await tryCatch(obs.sourceGetByName({name: NAMES.BACKGROUND, scene: scene.name}))).data || null;
        const background = backgroundRes ?? (await obs.browserAdd({
            name: NAMES.BACKGROUND,
            scene: scene.name,
            url: backgroundUrl.href,
            blend_properties: {
                blending_method: 'SRGB_OFF',
                blending_mode: 'NORMAL',
            },
            width: '100:%',
            height: '100:%',
        })).source;
        const overlayRes = $config.obs.overlay_uuid && (await tryCatch(obs.sourceGetByUuid({uuid: $config.obs.overlay_uuid}))).data || (await tryCatch(obs.sourceGetByName({name: NAMES.OVERLAY, scene: scene.name}))).data || null;
        const overlay = overlayRes ?? (await obs.browserAdd({
            name: NAMES.OVERLAY,
            scene: scene.name,
            url: overlayUrl.href,
            blend_properties: {
                blending_method: 'SRGB_OFF',
                blending_mode: 'NORMAL',
            },
            width: '100:%',
            height: '100:%',
        })).source;
        $config.obs.background_uuid = background.uuid || null;
        $config.obs.overlay_uuid = overlay.uuid || null;
        state = { type: 'setup' };
    }
</script>

<main>
    {#if state.type === 'waiting'}
        <div class="left">
            <h1>
                OBSを待機しています
                <Spinner />
            </h1>
            <p>起動しても反応しない場合</p>
            <ul>
                <li>OBSのバージョンが最新か確認する</li>
                <li>OBSを再起動してみる</li>
                <li>それでも反応しない場合は<a href="https://discord.gg/MZKvbPpsuK" target="_blank">Discord</a>でお知らせください</li>
            </ul>
            <Button onclick={() => {
                $scene = { type: 'main_menu' };
            }}>
                <i class="ti ti-chevron-right"></i>
            </Button>
        </div>
    {:else if state.type === 'prompt'}
        <div class="left">
            <h1>OBSに導入</h1>
            <p>これから設定を行います</p>
            <Button onclick={install} primary>
                <span>インストール</span>
                <i class="ti ti-check"></i>
            </Button>
        </div>
    {:else if state.type === 'installing'}
        <Spinner />
    {:else if state.type === 'setup'}
        <div class="left">
            <h1>あなたを追加</h1>
            <p>あなたのアバターをキッチンとカウンターの間に配置して準備完了！</p>
            <Button onclick={() => {
                $scene = { type: 'main_menu' };
            }} primary>
                <span>準備完了</span>
                <i class="ti ti-check"></i>
            </Button>
        </div>
        <img src={avatar_setup} alt="セットアップ" />
    {/if}
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        padding: 0 10%;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 10%;
        text-align: center;
        background: color-mix(in srgb, var(--color-bg-1) 98%, transparent 0%);
        color: var(--color-1);
    }

    .left {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
    }

    a {
        margin: 0 0.25rem;
    }

    ul {
        border-top: 1px solid var(--color-outline);
        padding-top: 1rem;
        margin-top: 0.5rem;
        padding-left: 1.25rem;
    }

    li {
        font-size: 0.8rem;
        color: var(--color-text);
    }
    
    h1 {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        color: var(--color-1);
    }

    p {
        font-size: 0.9rem;
        margin-bottom: 1rem;
        white-space: nowrap;
        color: var(--color-text);
    }

    img {
        max-width: 34rem;
        width: 50%;
        height: auto;
    }
</style>
