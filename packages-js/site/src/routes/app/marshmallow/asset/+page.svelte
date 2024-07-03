<script lang="ts">
    import { page } from '$app/stores';
    import { App, Omu } from '@omujs/omu';
    import { setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP_ID } from '../app.js';
    import { MarshmallowApp } from '../marshmallow-app.js';
    import AssetPage from '$lib/components/AssetPage.svelte';

    let assetId = BROWSER && $page.url.searchParams.get('assetId');
    const id = assetId || Date.now().toString();
    const omu = new Omu(
        new App(APP_ID.join('asset', id), {
            version: '0.1.0',
        }),
    );
    const marshmallow = new MarshmallowApp(omu);
    const { config, data } = marshmallow;
    setClient(omu);

    if (BROWSER) {
        omu.start();
    }
</script>

{#if id}
    <AssetPage>
        <main>
            {#if $data.message}
                <img
                    src="https://media.marshmallow-qa.com/system/images/{$data.message
                        .message_id}.png"
                    alt=""
                    class:async={!$config.syncScroll}
                    style="transform: translateY(calc(-100% * {$config.syncScroll
                        ? $data.scroll
                        : 0}));"
                />
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
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: start;
        align-items: start;
        overflow: hidden;
    }

    .async {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
    }
</style>
