<script lang="ts">
    import { OBSPermissions, OBSPlugin } from '@omujs/obs';
    import { Omu, OmuPermissions } from '@omujs/omu';
    import { AppHeader, AppPage, setGlobal } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { CHAT_OVERLAY_APP } from './app.js';
    import App from './App.svelte';
    import { ChatOverlayApp } from './chat-app.js';

    const omu = new Omu(CHAT_OVERLAY_APP);
    const obs = OBSPlugin.create(omu);
    const clockApp = new ChatOverlayApp(omu);
    setGlobal({ omu, obs });

    if (BROWSER) {
        omu.permissions.require(
            OmuPermissions.GENERATE_TOKEN_PERMISSION_ID,
            OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
            OmuPermissions.REGISTRY_PERMISSION_ID,
            OmuPermissions.ASSET_PERMISSION_ID,
            OBSPermissions.OBS_SOURCE_CREATE_PERMISSION_ID,
        );
        omu.start();
    }

    let promise = new Promise<void>((resolve) => {
        omu.onReady(async () => {
            resolve();
        });
    });
</script>

<AppPage>
    {#snippet header()}
        <header>
            <AppHeader app={omu.app} />
        </header>
    {/snippet}
    {#await promise then}
        <App {omu} {obs} chatOverlayApp={clockApp} />
    {/await}
</AppPage>
