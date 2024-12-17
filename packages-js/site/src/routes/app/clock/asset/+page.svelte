<script lang="ts">
    import { page } from '$app/stores';
    import AssetPage from '$lib/components/AssetPage.svelte';
    import { App, Omu } from '@omujs/omu';
    import { setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP_ID } from '../app.js';
    import { ClockApp } from '../clock-app.js';
    import ClockRenderer from '../components/ClockRenderer.svelte';

    let assetId = BROWSER && $page.url.searchParams.get('assetId');
    const id = assetId || Date.now().toString();
    const omu = new Omu(
        new App(APP_ID.join('asset', id), {
            version: '0.1.0',
        }),
    );
    const clockApp = new ClockApp(omu);
    setClient(omu);

    if (BROWSER) {
        omu.start();
    }

    let promise = new Promise<void>((resolve) => {
        omu.onReady(async () => {
            resolve();
        });
    });
</script>

{#if id}
    <AssetPage>
        <main>
            {#await promise then}
                {#await clockApp.fetchCalendar() then}
                    <ClockRenderer {clockApp} />
                {/await}
            {/await}
        </main>
    </AssetPage>
{:else}
    <p>id is not provided</p>
{/if}

<style>
    :global(body) {
        background: transparent !important;
        overflow: hidden;
    }

    main {
        position: absolute;
        inset: 0;
        color: var(--color-1);
        container-type: inline-size;
        display: flex;
        flex-direction: column;
        padding: 2rem;
        gap: 1rem;
    }
</style>
