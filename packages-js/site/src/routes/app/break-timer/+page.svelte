<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import { OBSPlugin, permissions } from '@omujs/obs';
    import { Omu } from '@omujs/omu';
    import { AppHeader, setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP } from './app.js';
    import App from './App.svelte';
    import { BreakTimerApp } from './break-timer-app.js';

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    omu.permissions.require(
        permissions.OBS_SCENE_SET_CURRENT_PERMISSION_ID,
        permissions.OBS_SCENE_READ_PERMISSION_ID,
        permissions.OBS_SOURCE_READ_PERMISSION_ID,
        permissions.OBS_SOURCE_CREATE_PERMISSION_ID,
    );
    const breakTimer = new BreakTimerApp(omu, obs);
    setClient(omu);

    const waitReady = new Promise<void>((resolve) => omu.onReady(resolve));

    if (BROWSER) {
        obs.requirePlugin();
        omu.start();
    }
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={APP} />
    </header>
    {#await waitReady then}
        <App {omu} {breakTimer} {obs} />
    {/await}
</AppPage>
