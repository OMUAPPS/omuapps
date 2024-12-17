<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import { OBSPlugin, permissions } from '@omujs/obs';
    import { Omu } from '@omujs/omu';
    import { ASSET_DOWNLOAD_PERMISSION_ID, ASSET_UPLOAD_PERMISSION_ID } from '@omujs/omu/extension/asset/asset-extension.js';
    import { AppHeader, setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP } from './app.js';
    import App from './App.svelte';
    import { ClockApp } from './clock-app.js';

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    const clockApp = new ClockApp(omu);
    setClient(omu);

    if (BROWSER) {
        omu.permissions.require(
            ASSET_UPLOAD_PERMISSION_ID,
            ASSET_DOWNLOAD_PERMISSION_ID,
            permissions.OBS_SOURCE_CREATE_PERMISSION_ID,
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
    <header slot="header">
        <AppHeader app={omu.app} />
    </header>
    {#await promise then}
        <App {omu} {obs} {clockApp} />
    {/await}
</AppPage>

