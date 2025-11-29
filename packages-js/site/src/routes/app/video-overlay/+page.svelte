<script lang="ts">
    import { OBSPermissions, OBSPlugin } from '@omujs/obs';
    import { Omu, OmuPermissions } from '@omujs/omu';
    import {
        AppHeader,
        AppPage,
        setGlobal,
    } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { VOICE_CHAT_PERMISSION_ID } from '../discord-overlay/plugin/plugin';
    import App from './App.svelte';
    import { VIDEO_OVERLAY_APP } from './app';
    import { VideoOverlayApp } from './video-overlay-app';

    const omu = new Omu(VIDEO_OVERLAY_APP);
    const obs = OBSPlugin.create(omu);
    const overlayApp = new VideoOverlayApp(omu);
    setGlobal({ omu, obs });

    if (BROWSER) {
        omu.permissions.require(
            OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
            OmuPermissions.REGISTRY_PERMISSION_ID,
            OmuPermissions.GENERATE_TOKEN_PERMISSION_ID,
            OmuPermissions.HTTP_REQUEST_PERMISSION_ID,
            OmuPermissions.ASSET_PERMISSION_ID,
            OBSPermissions.OBS_SOURCE_CREATE_PERMISSION_ID,
            VOICE_CHAT_PERMISSION_ID,
        );
        omu.start();
    }
</script>

<AppPage>
    {#snippet header()}
        <header>
            <AppHeader app={VIDEO_OVERLAY_APP} />
        </header>
    {/snippet}
    <main>
        {#await omu.waitForReady() then }
            <App {omu} {overlayApp} />
        {/await}
    </main>
</AppPage>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding-left: 2rem;
    }
</style>
