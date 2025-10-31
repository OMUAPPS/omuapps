<script lang="ts">
    import { omu } from '$lib/client.js';
    import { appWindow } from '$lib/tauri.js';
    import { App, BrowserTokenProvider, Identifier, OmuPermissions, type SessionParam } from '@omujs/omu';
    import { DEV } from 'esm-env';
    import { onMount } from 'svelte';
    import { isBetaEnabled } from '../settings.js';

    export const props = {};

    let state: { type: 'generating' } | { type: 'error'; message: string } | { type: 'open'; url: URL } = { type: 'generating' };

    function getExploreId() {
        if (DEV) {
            return new Identifier('com.omuapps', 'explore');
        }
        if ($isBetaEnabled) {
            return new Identifier('com.omuapps.beta', 'explore');
        } else {
            return new Identifier('com.omuapps', 'explore');
        }
    }

    function getExploreUrl(): URL {
        if (DEV) {
            return new URL('http://localhost:5173/app');
        }
        if ($isBetaEnabled) {
            return new URL('https://beta.omuapps.com/app');
        } else {
            return new URL('https://omuapps.com/app');
        }
    }

    onMount(async () => {
        const app = new App(getExploreId(), {});
        const tokenResult = await omu.sessions.generateToken({
            app: app,
            permissions: [
                OmuPermissions.DASHBOARD_APP_INSTALL_PERMISSION_ID,
                OmuPermissions.DASHBOARD_OPEN_APP_PERMISSION_ID,
                OmuPermissions.DASHOBARD_APP_READ_PERMISSION_ID,
                OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
                OmuPermissions.REGISTRY_PERMISSION_ID,
                OmuPermissions.TABLE_PERMISSION_ID,
            ],
        });
        if (tokenResult.type === 'error') {
            state = { type: 'error', message: 'Failed to generate token: ' + tokenResult.message };
            return;
        }
        const url = getExploreUrl();
        const paramJson: SessionParam = {
            token: tokenResult.token,
            address: omu.address,
        };
        url.searchParams.set(BrowserTokenProvider.TOKEN_PARAM_KEY, JSON.stringify(paramJson));
        state = { type: 'open', url };
    });
</script>

<div class="container">
    {#if state.type === 'open'}
        <iframe
            src={state.url.toString()}
            title=""
            frameborder="0"
            allow="camera; microphone"
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
