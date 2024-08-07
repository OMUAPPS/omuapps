<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import { OBSPlugin } from '@omujs/obs';
    import {
        OBS_SCENE_READ_PERMISSION_ID,
        OBS_SCENE_SET_CURRENT_PERMISSION_ID,
        OBS_SOURCE_CREATE_PERMISSION_ID,
        OBS_SOURCE_READ_PERMISSION_ID,
    } from '@omujs/obs/permissions.js';
    import { Omu } from '@omujs/omu';
    import { AppHeader, setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP } from './app.js';
    import App from './App.svelte';

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    obs.requirePlugin();
    omu.permissions.require(
        OBS_SCENE_READ_PERMISSION_ID,
        OBS_SOURCE_READ_PERMISSION_ID,
        OBS_SOURCE_CREATE_PERMISSION_ID,
        OBS_SCENE_SET_CURRENT_PERMISSION_ID,
    );
    setClient(omu);

    const waitReady = new Promise<void>((resolve) => omu.onReady(resolve));

    if (BROWSER) {
        omu.start();
    }
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={APP} />
    </header>
    {#await waitReady then}
        <App {obs} />
    {/await}
</AppPage>
