<script lang="ts">
    import { page } from '$app/stores';
    import AssetPage from '$lib/components/AssetPage.svelte';
    import { App, Omu } from '@omujs/omu';
    import { setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP_ID } from '../app.js';
    import { BreakTimerApp } from '../break-timer-app.js';

    let assetId = BROWSER && $page.url.searchParams.get('assetId');
    const id = assetId || Date.now().toString();
    const omu = new Omu(
        new App(APP_ID.join('asset', id), {
            version: '0.1.0',
        }),
    );
    const breakTimer = new BreakTimerApp(omu);
    const { config, state } = breakTimer;
    setClient(omu);

    let image: HTMLImageElement;

    if (BROWSER) {
        omu.start();
    }
</script>

{#if id}
    <AssetPage>
        <main></main>
    </AssetPage>
{:else}
    <p>id is not provided</p>
{/if}

<style>
    :global(body) {
        background: transparent !important;
    }

    main {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: start;
        padding-top: 4rem;
        overflow: hidden;
    }
</style>
