<script lang="ts">
    import { omu } from '$lib/client';
    import { tryCatch } from '$lib/result';
    import { appWindow } from '$lib/tauri';
    import { BrowserSession, type App } from '@omujs/omu';
    import { Spinner } from '@omujs/ui';
    import { onMount } from 'svelte';

    interface Props {
        data: {
            app: App;
        };
    }

    let { data }: Props = $props();
    let { app } = data;

    let appState: {
        type: 'generating';
    } | {
        type: 'error'; message: string;
    } | {
        type: 'open'; url: URL; loading: boolean;
    } = $state({
        type: 'generating',
    });

    onMount(async () => {
        if (!app.url) {
            appState = { type: 'error', message: 'App has no URL' };
            return;
        }
        const { data: session, error } = await tryCatch(omu.sessions.generateToken({
            app: app,
        }));
        if (error) {
            appState = { type: 'error', message: 'Failed to generate token: ' + error };
            return;
        }
        const url = new URL(app.url);
        url.searchParams.set(BrowserSession.PARAM_NAME, JSON.stringify(session));
        appState = { type: 'open', url, loading: true };
    });
</script>

<div class="container">
    {#if appState.type === 'generating'}
        <div class="loading">
            <Spinner /> 認証中
        </div>
    {:else if appState.type === 'error'}
        <div class="loading">Error: {appState.message}</div>
    {:else if appState.type === 'open'}
        {#if appState.loading}
            <div class="loading">
                <Spinner />
                {#if app.metadata?.name}
                    {omu.i18n.translate(app.metadata.name)}
                    アプリを読み込み中
                {:else}
                    読み込み中
                {/if}
            </div>
        {/if}
        <iframe
            onload={() => {
                if (appState.type !== 'open') {
                    throw new Error(`Invalid state: ${appState.type}`);
                }
                appState.loading = false;
            }}
            src={appState.url.toJSON()}
            title=""
            frameborder="0"
            allow="camera; microphone; clipboard-read; clipboard-write; fullscreen; display-capture"
        ></iframe>
    {/if}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="window-resize bottom"
        onmousedown={() => {
            appWindow.startResizeDragging('South');
        }}
    ></div>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="window-resize right"
        onmousedown={() => {
            appWindow.startResizeDragging('East');
        }}
    ></div>
</div>

<style lang="scss">
    .container {
        position: relative;
        width: 100%;
        height: 100%;
    }

    .loading {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: baseline;
        gap: 1rem;
        font-size: 1rem;
        padding: 1rem 1rem;
        color: var(--color-1);
    }

    iframe {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border: none;
    }

    .window-resize {
        position: absolute;
        bottom: 0;
        right: 0;
        border: none;
        background: none;

        &.bottom {
            left: 0;
            height: 5px;
            cursor: ns-resize;
        }

        &.right {
            top: 0;
            width: 5px;
            cursor: ew-resize;
        }
    }
</style>
