<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import AssetButton from '$lib/components/AssetButton.svelte';
    import { Chat } from '@omujs/chat';
    import { Reaction } from '@omujs/chat/models/reaction.js';
    import { CHAT_REACTION_PERMISSION_ID } from '@omujs/chat/permissions.js';
    import { OBSPlugin, permissions } from '@omujs/obs';
    import { Omu } from '@omujs/omu';
    import { ASSET_UPLOAD_PERMISSION_ID } from '@omujs/omu/extension/asset/asset-extension.js';
    import { Identifier } from '@omujs/omu/identifier.js';
    import {
        AppHeader,
        ButtonMini,
        FileDrop,
        Tooltip,
        setClient,
    } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP, APP_ID } from './app.js';
    import ReactionRenderer from './components/ReactionRenderer.svelte';
    import Slider from './components/Slider.svelte';
    import { ReactionApp } from './reaction-app.js';

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    const chat = Chat.create(omu);
    const reactionApp = new ReactionApp(omu, chat);
    const { config } = reactionApp;
    setClient(omu);

    function test() {
        const reaction = new Reaction({
            roomId: APP_ID.join('test'),
            reactions: {
                '❤': 1,
                '😄': 1,
                '🎉': 1,
                '😳': 1,
                '💯': 1,
            },
        });
        reactionApp.send(reaction);
    }

    async function handleReplace(key: string, files: FileList) {
        const file = files[0];
        const reader = new FileReader();
        const id = omu.app.id.join('asset', key);
        reader.onload = async () => {
            const buffer = new Uint8Array(reader.result as ArrayBuffer);
            const asset = await omu.assets.upload(id, buffer);
            $config.replaces = { ...$config.replaces, [key]: asset.key() };
        };
        reader.readAsArrayBuffer(file);
    }

    if (BROWSER) {
        omu.permissions.require(
            permissions.OBS_SOURCE_READ_PERMISSION_ID,
            permissions.OBS_SOURCE_CREATE_PERMISSION_ID,
            ASSET_UPLOAD_PERMISSION_ID,
            CHAT_REACTION_PERMISSION_ID,
        );
        omu.start();
    }
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={APP} />
    </header>
    <main>
        <div class="reaction-preview">
            <ReactionRenderer {omu} {reactionApp} />
        </div>
        <div class="right">
            <h3>
                配信ソフトに追加する
                <i class="ti ti-arrow-bar-to-down" />
            </h3>
            <section>
                <AssetButton {omu} {obs} />
            </section>
            <h3>
                試してみる
                <i class="ti ti-rocket" />
            </h3>
            <section>
                <button on:click={test}>
                    <Tooltip>
                        <span>テスト用のリアクションを送信します</span>
                    </Tooltip>
                    <i class="ti ti-player-play" />
                    再生
                </button>
            </section>
        </div>
        <div class="left">
            <h3>
                見た目を調整する
                <i class="ti ti-dimensions" />
            </h3>
            <section class="settings">
                <Slider
                    bind:value={$config.scale}
                    min={0.5}
                    max={2.5}
                    step={0.05}
                    type="percent"
                >
                    大きさ
                </Slider>
                <Slider
                    bind:value={$config.depth}
                    min={0}
                    max={1}
                    step={0.01}
                    type="percent"
                >
                    奥行き感
                </Slider>
            </section>
            <h3>
                画像を変える
                <i class="ti ti-mood-wink-2" />
            </h3>
            <section>
                {#each Object.entries($config.replaces) as [key, assetId]}
                    <div class="replace-entry">
                        <div class="preview">
                            <h1>
                                {key}
                            </h1>
                            {#if assetId}
                                <i class="ti ti-chevron-right" />
                                <img
                                    src={omu.assets.url(Identifier.fromKey(assetId), {
                                        noCache: true,
                                    })}
                                    alt={key}
                                    class="replace-image"
                                />
                            {/if}
                        </div>
                        <div class="actions">
                            {#if assetId}
                                <ButtonMini
                                    on:click={() =>
                                        ($config.replaces = { ...$config.replaces, [key]: null })}
                                >
                                    <Tooltip>置き換えを削除</Tooltip>
                                    <i class="ti ti-trash" />
                                </ButtonMini>
                            {/if}
                            <FileDrop handle={(files) => handleReplace(key, files)}>
                                <i class="ti ti-upload" />
                                置き換える
                            </FileDrop>
                        </div>
                    </div>
                {/each}
            </section>
        </div>
    </main>
</AppPage>

<style lang="scss">
    main {
        display: flex;
        gap: 20px;
        padding: 2.5rem 2rem;
    }

    .left {
        width: min(100%, 25rem);
        margin-left: auto;
    }

    .right {
        width: 25rem;
    }

    .settings {
        background: var(--color-bg-2);
        padding: 20px;
    }

    .reaction-preview {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: -1;
    }

    .replace-entry {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
        justify-content: space-between;
        width: min(100%, 25rem);
        padding: 0.5rem 1rem;
        background: var(--color-bg-2);

        .preview {
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .actions {
            display: flex;
            align-items: center;
            gap: 10px;
        }
    }

    .replace-image {
        max-height: 50px;
        min-width: 50px;
        object-fit: contain;
    }

    h1 {
        font-family: "Noto Color Emoji";
    }

    h3 {
        color: var(--color-1);
        margin-bottom: 10px;
    }

    section {
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: start;
        justify-content: flex-start;
        width: 100%;
        padding: 0px;
        margin-bottom: 20px;
    }

    img {
        max-width: 100%;
        max-height: 40px;
    }

    button {
        padding: 0.5rem 1rem;
        background: var(--color-1);
        color: var(--color-bg-1);
        font-size: 0.9rem;
        font-weight: 500;
        border: none;
        border-radius: 2.5px;
        cursor: pointer;

        &:hover {
            background: var(--color-1);
        }
    }
</style>
