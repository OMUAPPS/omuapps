<script lang="ts">
    import { OBSPermissions, OBSPlugin } from '@omujs/obs';
    import { Omu, OmuPermissions } from '@omujs/omu';
    import { AppHeader, AppPage, setGlobal } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { onMount } from 'svelte';
    import { APP } from './app.js';
    import App from './App.svelte';
    import { RemoteApp } from './remote-app.js';

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    const remote = new RemoteApp(omu, 'app');
    setGlobal({ omu, obs });

    if (BROWSER) {
        onMount(() => {
            omu.permissions.require(
                OBSPermissions.OBS_SOURCE_CREATE_PERMISSION_ID,
                OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
                OmuPermissions.REGISTRY_PERMISSION_ID,
                OmuPermissions.REMOTE_APP_REQUEST_PERMISSION_ID,
                OmuPermissions.ASSET_UPLOAD_PERMISSION_ID,
                OmuPermissions.ASSET_DOWNLOAD_PERMISSION_ID,
                OmuPermissions.ASSET_DELETE_PERMISSION_ID,
                OmuPermissions.GENERATE_TOKEN_PERMISSION_ID,
            );
            omu.start();
        });
    }

    const promise = new Promise<void>((resolve) => {
        omu.onReady(() => {
            resolve();
        });
    });
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={omu.app} />
    </header>
    {#await promise}
        <p>loading...</p>
    {:then}
        <App {omu} {remote} />
    {/await}
</AppPage>

<style lang="scss">
</style>
