<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import { Omu } from '@omujs/omu';
    import { AppHeader, setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP } from './app.js';
    import App from './App.svelte';
    import { OBSSyncApp } from './obssync-app.js';

    const omu = new Omu(APP);
    const obs = new OBSSyncApp(omu);
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
