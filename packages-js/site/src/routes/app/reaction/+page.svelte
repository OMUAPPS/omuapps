<script lang="ts">
    import { page } from '$app/stores';
    import { Chat } from '@omujs/chat';
    import { Reaction } from '@omujs/chat/models/reaction.js';
    import { CHAT_REACTION_PERMISSION_ID } from '@omujs/chat/permissions.js';
    import { Omu } from '@omujs/omu';
    import { ASSET_UPLOAD_PERMISSION_ID } from '@omujs/omu/extension/asset/asset-extension.js';
    import { Identifier } from '@omujs/omu/identifier.js';
    import {
        AppHeader,
        ButtonMini,
        DragLink,
        FileDrop,
        FlexRowWrapper,
        Tooltip,
        setClient,
    } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP, IDENTIFIER } from './app.js';
    import ReactionRenderer from './components/ReactionRenderer.svelte';
    import { ReactionApp } from './reaction-app.js';
    import AppPage from '$lib/components/AppPage.svelte';
    import AssetButton from '$lib/components/AssetButton.svelte';

    const omu = new Omu(APP);
    const chat = new Chat(omu);
    const reactionApp = new ReactionApp(omu, chat);
    const { config } = reactionApp;
    setClient(omu);

    function test() {
        const reaction = new Reaction({
            roomId: IDENTIFIER.join('test'),
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
        omu.permissions.require(ASSET_UPLOAD_PERMISSION_ID, CHAT_REACTION_PERMISSION_ID);
        omu.start();
    }
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={APP} />
    </header>
    <main>
        <div class="preview">
            <ReactionRenderer {omu} {reactionApp} />
        </div>
        <h3>リアクションをテストする</h3>
        <section>
            <FlexRowWrapper gap>
                <button on:click={test}>
                    <i class="ti ti-player-play" />
                    テスト
                </button>
            </FlexRowWrapper>
        </section>

        <h3>OBSに貼り付ける</h3>
        <section>
            <AssetButton />
        </section>

        <h3>画像を置き換える</h3>
        <section>
            {#each Object.entries($config.replaces) as [key, assetId]}
                <div class="replace-entry">
                    <FlexRowWrapper alignItems="center" gap>
                        <h1>
                            {key}
                        </h1>
                        {#if assetId}
                            <i class="ti ti-chevron-right" />
                            <img
                                src={omu.assets.url(Identifier.fromKey(assetId), { noCache: true })}
                                alt={key}
                                class="replace-image"
                            />
                        {/if}
                    </FlexRowWrapper>
                    <FlexRowWrapper gap alignItems="center">
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
                    </FlexRowWrapper>
                </div>
            {/each}
        </section>
    </main>
</AppPage>

<style lang="scss">
    main {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: start;
        justify-content: flex-start;
        width: 100%;
        height: 100vh;
        padding: 40px;
    }

    .preview {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: -1;
    }

    .replace-entry {
        display: flex;
        gap: 10px;
        align-items: center;
        justify-content: space-between;
        width: min(100%, 600px);
        padding: 10px 20px;
        background: var(--color-bg-2);
    }

    .replace-image {
        max-height: 50px;
        min-width: 50px;
        object-fit: contain;
    }

    h1 {
        font-family: 'Noto Color Emoji';
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
        background: none;
        border: none;
        cursor: pointer;
        margin: 0;
        height: 30px;
        padding: 10px;
        display: flex;
        font-size: 14px;
        align-items: center;
        justify-content: center;
        color: var(--color-1);
        background: var(--color-bg-2);
        outline: 1px solid var(--color-1);
        outline-offset: -1px;
        border-radius: 4px;

        &:hover {
            background: var(--color-bg-1);
        }

        &:active {
            background: var(--color-1);
            color: var(--color-bg-2);
        }
    }
</style>
