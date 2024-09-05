<script lang="ts">
    import { page } from '$app/stores';
    import AssetPage from '$lib/components/AssetPage.svelte';
    import { OBSPlugin } from '@omujs/obs';
    import { App, Omu } from '@omujs/omu';
    import { setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP_ID } from '../app.js';
    import { BreakTimerApp } from '../break-timer-app.js';
    import Timer from '../components/TimeRenderer.svelte';

    let assetId = BROWSER && $page.url.searchParams.get('assetId');
    const id = assetId || Date.now().toString();
    const omu = new Omu(
        new App(APP_ID.join('asset', id), {
            version: '0.1.0',
        }),
    );
    const obs = new OBSPlugin(omu);
    const breakTimer = new BreakTimerApp(omu, obs);
    const { config, state } = breakTimer;
    setClient(omu);

    if (BROWSER) {
        omu.start();
    }
</script>

{#if id}
    <AssetPage>
        <main>
            {#if $state.type === 'break' && $config.timer}
                <Timer end={$state.start + $config.timer.duration * 1000}>
                    <h1>{$config.timer.message}</h1>
                </Timer>
            {/if}
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
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: start;
        padding-top: 4rem;
        overflow: hidden;
    }

    h1 {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 2rem;
        background: #000;
        color: var(--color-1);
        text-align: center;
    }
</style>
