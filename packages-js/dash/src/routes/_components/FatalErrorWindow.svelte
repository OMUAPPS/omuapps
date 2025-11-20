<script lang="ts">
    import title from '$lib/images/title.svg';
    import { isBetaEnabled } from '$lib/main/settings.js';
    import type { UpdateEvent } from '$lib/tauri';
    import { applyUpdate, checkUpdate, invoke } from '$lib/tauri.js';
    import TitlebarButton from '$lib/TitlebarButton.svelte';
    import { VERSION } from '$lib/version';
    import '@omujs/ui';
    import { Button, ExternalLink, Spinner } from '@omujs/ui';
    import '@tabler/icons-webfont/dist/tabler-icons.scss';
    import { relaunch } from '@tauri-apps/plugin-process';
    import { DEV } from 'esm-env';
    import '../styles.scss';

    export let message: string;

    let updateProgress: UpdateEvent | undefined = undefined;
</script>

<div class="window">
    <div data-tauri-drag-region></div>
    <div class="titlebar">
        <div class="title">
            <img src={title} alt="Title" />
            <span class="version">
                {VERSION}
                {(DEV && ' (dev)') || ($isBetaEnabled && ' (beta)') || ''}
            </span>
        </div>
        <div class="actions">
            <TitlebarButton
                onclick={close}
                icon="ti-x"
                tooltip="Close"
            />
        </div>
    </div>
    <div class="content">
        <div class="message">
            <h2>初期化に失敗しました</h2>
            <small>{message}</small>
        </div>
        <div class="update">
            {#await checkUpdate()}
                アップデートを確認しています
                <Spinner />
            {:then update}
                {#if update}
                    <p>新しいアップデートがあります</p>
                    <small>現在 {update.currentVersion} から {update.version} に更新</small>
                    <Button onclick={async () => {
                        await applyUpdate(update, (progress) => {
                            updateProgress = progress;
                        });
                    }} primary>
                        アップデートを適用
                    </Button>
                    <small>
                        {#if updateProgress}
                            {#if updateProgress.type === 'restarting' || updateProgress.type === 'shutting-down'}
                                サーバーを停止しています
                            {:else if updateProgress.type === 'updating'}
                                ダウンロード中... {Math.floor(updateProgress.downloaded / updateProgress.contentLength * 100)}%
                            {/if}
                        {/if}
                    </small>
                {:else}
                    <p>
                        最新の状態です
                    </p>
                    <small>
                        環境を再構築しても起動しない場合は<ExternalLink href='https://omuapps.com/redirect/discord'>公式Discordサポートサーバー</ExternalLink>までご連絡ください。
                    </small>
                    <small>バージョン: {VERSION}</small>
                {/if}
            {/await}
        </div>
        <div class="actions">
            <Button onclick={() => invoke('generate_log_file')} let:promise>
                {#if promise}
                    {#await promise}
                        ログを生成中
                        <Spinner />
                    {:then}
                        ログを生成しました
                    {:catch e}
                        ログの生成に失敗しました: {e}
                    {/await}
                {:else}
                    ログを生成
                    <i class="ti ti-file"></i>
                {/if}
            </Button>
            <Button primary onclick={async () => {
                await invoke('clean_environment');
                await relaunch();
            }}>
                環境を再構築
                <i class="ti ti-trash-x"></i>
            </Button>
        </div>
    </div>
</div>

<style lang="scss">
    $height: 2.5rem;

    .window {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: var(--color-bg-2);
        outline-offset: -1px;
        font-weight: 600;
        color: var(--color-text);

        > .titlebar {
            position: relative;
            top: 0;
            left: 0;
            z-index: 1000;
            display: flex;
            flex-direction: row;
            align-items: center;
            width: 100vw;
            height: $height;
            user-select: none;
            background: var(--color-bg-2);
            outline: 1px solid var(--color-outline);
            outline-offset: -1px;

            > .title {
                position: absolute;
                display: flex;
                flex-direction: row;
                gap: 0.25rem;
                align-items: center;
                justify-content: center;
                margin-left: 1rem;
                pointer-events: none;

                > img {
                    height: 0.621rem;
                }
            }

            > .actions {
                position: absolute;
                top: 0;
                right: 0;
                display: flex;
                flex-direction: row;
            }
        }
    }

    div[data-tauri-drag-region] {
        -webkit-app-region: drag;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: $height;
    }

    .version {
        color: var(--color-1);
        font-size: 0.6rem;
        font-weight: 600;
        position: relative;
        top: -2px;
    }

    .content {
        position: absolute;
        top: $height;
        inset: 0;
        overflow: hidden;
        background: var(--color-bg-1);
        display: flex;
        flex-direction: column;
        gap: 2rem;
        align-items: center;
        justify-content: center;
    }

    .message {
        background: var(--color-bg-2);
        width: 30rem;
        height: 10rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
    }

    h2, p {
        color: var(--color-1);
    }

    .update {
        height: 5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
    }

    .actions {
        height: 5rem;
        display: flex;
        align-items: center;
        gap: 1rem;
    }
</style>
