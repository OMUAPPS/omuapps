<script lang="ts">
    import { page } from '$app/stores';
    import AssetPage from '$lib/components/AssetPage.svelte';
    import { App, Omu } from '@omujs/omu';
    import { setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP_ID } from '../app.js';
    import Timer from '../components/Timer.svelte';
    import { TimerApp } from '../timer-app.js';

    let assetId = BROWSER && $page.url.searchParams.get('assetId');
    const id = assetId || Date.now().toString();
    const app = new App(APP_ID.join('asset', id), {
        version: '0.1.0',
    });
    const omu = new Omu(app);
    const timer = new TimerApp(omu);
    const { config } = timer;
    setClient(omu);

    if (BROWSER) {
        omu.start();
    }

    $: alignHorizontal = {
        start: 'start',
        middle: 'center',
        end: 'end',
    }[$config.style.align.x];
    $: alignVertical = {
        start: 'start',
        middle: 'center',
        end: 'end',
    }[$config.style.align.y];
</script>

{#if id}
    <AssetPage>
        <main style:justify-content={alignHorizontal} style:align-items={alignVertical}>
            <Timer {timer} />
        </main>
    </AssetPage>
{:else}
    <p>id is not provided</p>
{/if}

<style>
    :global(body) {
        background: transparent !important;
    }

    main {
        display: flex;
        height: 100vh;
    }
</style>
