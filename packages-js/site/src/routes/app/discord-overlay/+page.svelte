<script lang="ts">
    import { OBSPermissions, OBSPlugin } from '@omujs/obs';
    import { Omu, OmuPermissions } from '@omujs/omu';
    import { AppPage, setGlobal } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP, DISCORD_PLUGIN_APP } from './app.js';
    import App from './App.svelte';
    import {
        DiscordOverlayApp,
    } from './discord-overlay-app.js';
    import { VOICE_CHAT_PERMISSION_ID } from './plugin/plugin.js';

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    const overlayApp = DiscordOverlayApp.create(omu, 'client');
    setGlobal({ omu, obs });

    if (BROWSER) {
        omu.permissions.require(
            OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
            OmuPermissions.REGISTRY_PERMISSION_ID,
            OmuPermissions.ASSET_UPLOAD_PERMISSION_ID,
            OmuPermissions.ASSET_DOWNLOAD_PERMISSION_ID,
            OmuPermissions.GENERATE_TOKEN_PERMISSION_ID,
            OmuPermissions.DAShBOARD_DRAG_DROP_PERMISSION_ID,
            OmuPermissions.HTTP_REQUEST_PERMISSION_ID,
            OBSPermissions.OBS_SOURCE_CREATE_PERMISSION_ID,
            VOICE_CHAT_PERMISSION_ID,
        );
        omu.sessions.require(DISCORD_PLUGIN_APP);
        omu.start();
    }

    let promise = new Promise<void>((resolve) => {
        omu.onReady(async () => {
            resolve();
        });
    });
</script>

<AppPage>
    {#await promise then}
        <App {omu} {obs} {overlayApp} />
    {/await}
</AppPage>
