<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import { OBSPermissions, OBSPlugin } from '@omujs/obs';
    import { Omu, OmuPermissions } from '@omujs/omu';
    import { AppHeader, setGlobal } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP } from './app.js';
    import App from './App.svelte';
    import { ClockApp } from './clock-app.js';

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    const clockApp = new ClockApp(omu);
    setGlobal({ omu, obs });

    if (BROWSER) {
        omu.permissions.require(
            OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
            OmuPermissions.REGISTRY_PERMISSION_ID,
            OmuPermissions.ASSET_UPLOAD_PERMISSION_ID,
            OmuPermissions.ASSET_DOWNLOAD_PERMISSION_ID,
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
    <header slot="header">
        <AppHeader app={omu.app} />
    </header>
    {#await promise then}
        <App {omu} {obs} {clockApp} />
    {/await}
</AppPage>
