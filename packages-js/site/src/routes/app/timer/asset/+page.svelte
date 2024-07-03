<script lang="ts">
    import { page } from '$app/stores';
    import { App, Omu } from '@omujs/omu';
    import { setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { IDENTIFIER } from '../app.js';
    import Timer from '../components/Timer.svelte';
    import { TimerApp } from '../timer-app.js';
    import AssetPage from '$lib/components/AssetPage.svelte';

    let assetId = BROWSER && $page.url.searchParams.get('assetId');
    const id = assetId || Date.now().toString();
    const app = new App(IDENTIFIER.join('asset', id), {
        version: '0.1.0',
    });
    const omu = new Omu(app);
    const timer = new TimerApp(omu);
    const { config } = timer;
    setClient(omu);

    if (BROWSER) {
        omu.start();
    }

    $: alignVertical = {
        top: 'start',
        center: 'center',
        bottom: 'end',
    }[$config.style.align.split('-')[0]];
    $: alignHorizontal = {
        left: 'start',
        center: 'center',
        right: 'end',
    }[$config.style.align.split('-')[1]];
</script>

{#if id}
    <AssetPage>
        <main
            style="
        justify-content: {alignHorizontal};
        align-items: {alignVertical};"
        >
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
