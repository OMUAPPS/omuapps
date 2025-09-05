<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import { Chat } from '@omujs/chat';
    import { OBSPlugin, permissions } from '@omujs/obs';
    import { Omu } from '@omujs/omu';
    import { AppHeader, setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP } from './app.js';
    import App from './App.svelte';
    import { ReplayApp } from './replay-app.js';

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    const chat = Chat.create(omu);
    ReplayApp.create(omu, 'client');
    setClient(omu);

    if (BROWSER) {
        omu.permissions.require(permissions.OBS_SOURCE_CREATE_PERMISSION_ID);
        omu.start();
    }
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={omu.app} />
    </header>
    <main>
        {#await omu.waitForReady() then}
            <App {obs} {chat} />
        {/await}
    </main>
</AppPage>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        padding: 2rem;
        color: var(--color-1);
        container-type: inline-size;
        overflow-y: auto;
        overflow-x: hidden;
        display: flex;
    }
</style>
