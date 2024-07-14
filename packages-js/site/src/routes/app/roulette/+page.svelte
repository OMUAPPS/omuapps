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
    <main>
        <App {omu} />
    </main>
</AppPage>

<style lang="scss">
    main {
        position: relative;
        display: flex;
        align-items: start;
        justify-content: flex-start;
        gap: 1rem;
        width: 100%;
        height: 100vh;
        padding: 1rem;
        background: var(--color-bg-1);
        overflow: hidden;
    }
</style>
