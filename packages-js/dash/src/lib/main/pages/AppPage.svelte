<script lang="ts">
    import { omu } from '$lib/client';
    import { appWindow } from '$lib/tauri';
    import { BrowserTokenProvider, type App, type SessionParam } from '@omujs/omu';
    import { Spinner } from '@omujs/ui';
    import { onMount } from 'svelte';

    export let props: {
        app: App;
    };

    let state: { type: 'generating' } | { type: 'error'; message: string } | { type: 'open'; url: URL } = { type: 'generating' };
    onMount(async () => {
        if (!props.app.url) {
            state = { type: 'error', message: 'App has no URL' };
            return;
        }
        const tokenResult = await omu.sessions.generateToken({
            app: props.app,
            permissions: [],
        });
        if (tokenResult.type === 'error') {
            state = { type: 'error', message: 'Failed to generate token: ' + tokenResult.message };
            return;
        }
        const url = new URL(props.app.url);
        const paramJson: SessionParam = {
            token: tokenResult.token,
            address: omu.address,
        };
        url.searchParams.set(BrowserTokenProvider.TOKEN_PARAM_KEY, JSON.stringify(paramJson));
        state = { type: 'open', url };
    });
    let loading = true;
</script>

<div class="container">
    {#if state.type === 'generating'}
        <div class="loading">
            <Spinner /> 認証中
        </div>
    {:else if state.type === 'error'}
        <div class="loading">Error: {state.message}</div>
    {:else if state.type === 'open'}
        {#if loading}
            <div class="loading">
                <Spinner />
                {#if props.app.metadata?.name}
                    {omu.i18n.translate(props.app.metadata.name)}
                    アプリを読み込み中
                {:else}
                    読み込み中
                {/if}
            </div>
        {/if}
        <iframe
            on:load={() => {
                loading = false;
            }}
            src={state.url.toJSON()}
            title=""
            frameborder="0"
            allow="camera; microphone; clipboard-read; clipboard-write; fullscreen"
        ></iframe>
    {/if}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        class="window-resize bottom"
        on:mousedown={() => {
            appWindow.startResizeDragging('South');
        }}
    ></div>
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        class="window-resize right"
        on:mousedown={() => {
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
