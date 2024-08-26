<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import { Omu } from '@omujs/omu';
    import { AppHeader, setClient } from '@omujs/ui';
    import { APP } from './app.js';
    import App from './App.svelte';

    const omu = new Omu(APP);
    setClient(omu);
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={APP} />
    </header>
    <App {omu} />
</AppPage>
