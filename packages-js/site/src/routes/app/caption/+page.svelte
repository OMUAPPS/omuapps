<script lang="ts">
    import { OBSPermissions, OBSPlugin } from '@omujs/obs';
    import { Omu, OmuPermissions } from '@omujs/omu';
    import {
        AppHeader,
        AppPage,
        setGlobal,
    } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import App from './App.svelte';
    import { APP } from './app.js';
    import { CaptionApp } from './caption-app.js';

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    const captionApp = new CaptionApp(omu);
    setGlobal({ omu, obs });

    if (BROWSER) {
        omu.permissions.require(
            OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
            OmuPermissions.REGISTRY_PERMISSION_ID,
            OBSPermissions.OBS_SOURCE_CREATE_PERMISSION_ID,
            OmuPermissions.DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
            OmuPermissions.GENERATE_TOKEN_PERMISSION_ID,
        );
        omu.start();
    }

</script>

<AppPage>
    {#snippet header()}
        <header>
            <AppHeader app={APP} />
        </header>
    {/snippet}
    {#await omu.waitForReady() then}
        <App {omu} {obs} {captionApp} />
    {/await}
</AppPage>
