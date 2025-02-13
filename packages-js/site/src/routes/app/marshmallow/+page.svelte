<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import { VERSION } from '$lib/version.js';
    import { OBSPlugin, permissions } from '@omujs/obs';
    import { Omu } from '@omujs/omu';
    import { AppHeader, setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP } from './app.js';
    import App from './App.svelte';
    import { MarshmallowApp, PLUGIN_ID } from './marshmallow-app.js';

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    const marshmallow = new MarshmallowApp(omu);
    setClient(omu);

    omu.plugins.require({
        omuplugin_marshmallow: `==${VERSION}`,
    });
    omu.server.require(PLUGIN_ID);

    const waitReady = new Promise<void>((resolve) => omu.onReady(resolve));

    if (BROWSER) {
        omu.permissions.require(
            permissions.OBS_SOURCE_CREATE_PERMISSION_ID,
        );
        omu.start();
    }
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={APP} />
    </header>
    {#await waitReady then}
        <App {omu} {marshmallow} {obs} />
    {/await}
</AppPage>
