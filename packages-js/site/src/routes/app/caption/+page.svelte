<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import { OBSPlugin, permissions } from '@omujs/obs';
    import { Omu } from '@omujs/omu';
    import { DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID } from '@omujs/omu/api/dashboard';
    import {
        AppHeader,
        setClient,
    } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import App from './App.svelte';
    import { APP } from './app.js';
    import { CaptionApp } from './caption-app.js';

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    const captionApp = new CaptionApp(omu);
    setClient(omu);

    if (BROWSER) {
        omu.permissions.require(
            permissions.OBS_SOURCE_CREATE_PERMISSION_ID,
            DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
        );
        omu.start();
    }

</script>

<AppPage>
    <header slot="header">
        <AppHeader app={APP} />
    </header>
    {#await omu.waitForReady() then}
        <App {omu} {obs} {captionApp} />
    {/await}
</AppPage>
