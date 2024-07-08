<script lang="ts">
    import AssetPage from '$lib/components/AssetPage.svelte';
    import '@fontsource/rocknroll-one';
    import { Chat } from '@omujs/chat';
    import { App, Omu } from '@omujs/omu';
    import { setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP_ID } from '../app.js';
    import { RouletteApp } from '../roulette-app.js';
    import Roulette from '../components/Roulette.svelte';
    import { page } from '$app/stores';

    let assetId = BROWSER && $page.url.searchParams.get('assetId');
    const id = assetId || Date.now().toString();
    const ASSET_APP = new App(APP_ID.join('asset', id), {
        version: '0.1.0',
    });
    const omu = new Omu(ASSET_APP);
    const chat = new Chat(omu);
    const roulette = new RouletteApp(omu);
    const { config, state } = roulette;
    setClient(omu);

    if (BROWSER) {
        omu.start();
    }
</script>

<AssetPage>
    <main>
        {$config.text}
        <Roulette {roulette} />
    </main>
</AssetPage>

<style lang="scss">
    main {
        position: fixed;
        inset: 0;
    }

    :global(body) {
        background: transparent !important;
    }
</style>
