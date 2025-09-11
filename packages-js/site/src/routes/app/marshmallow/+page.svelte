<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import { OBSPlugin, permissions as obsPerms } from '@omujs/obs';
    import { Omu } from '@omujs/omu';
    import { DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID, DASHBOARD_WEBVIEW_PERMISSION_ID } from '@omujs/omu/api/dashboard';
    import { HTTP_REQUEST_PERMISSION_ID } from '@omujs/omu/api/http';
    import { AppHeader, setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { MarshmallowAPI, MarshmallowSession } from './api.js';
    import { APP } from './app.js';
    import App from './App.svelte';
    import { MarshmallowApp } from './marshmallow-app.js';

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    const marshmallow = new MarshmallowApp(omu);
    setClient(omu);

    async function getAPI() {
        await omu.dashboard.requestHost({
            host: 'marshmallow-qae.com',
        });
        const session = await MarshmallowSession.get(omu) ?? await MarshmallowSession.login(omu);
        if (!session) {
            console.warn('Failed to get session');
            return;
        }
        return MarshmallowAPI.new(omu, session);
    }

    const api = omu.waitForReady().then(() => getAPI());

    if (BROWSER) {
        omu.permissions.require(
            obsPerms.OBS_SOURCE_CREATE_PERMISSION_ID,
            DASHBOARD_WEBVIEW_PERMISSION_ID,
            DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
            HTTP_REQUEST_PERMISSION_ID,
        );
        omu.start();
    }
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={APP} />
    </header>
    {#await api then api}
        {#if api}
            <App {omu} {marshmallow} {obs} {api} />
        {/if}
    {/await}
</AppPage>
