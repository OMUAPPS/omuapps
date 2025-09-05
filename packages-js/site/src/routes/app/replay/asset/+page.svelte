<script lang="ts">
    import { page } from '$app/stores';
    import AssetPage from '$lib/components/AssetPage.svelte';
    import { App, Omu } from '@omujs/omu';
    import { setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import type { TagKey } from '../../category.js';
    import { buildMetadata } from '../../origin.js';
    import { APP_ID } from '../app.js';
    import { ReplayApp } from '../replay-app.js';
    import AssetApp from './AssetApp.svelte';

    let assetId = BROWSER && $page.url.searchParams.get('assetId');
    const id = assetId || Date.now().toString();
    const ASSET_APP = new App(APP_ID.join('asset', id), {
        metadata: buildMetadata({
            locale: 'en',
            name: {
                ja: 'リプレイ',
                en: 'Replay',
            },
            description: {
                ja: '過去の配信や動画を配信に写しながら再生することができます',
                en: 'Play past streams or videos on your stream',
            },
            tags: ['tool', 'youtube', 'asset'] as TagKey[],
        }),
    });
    const omu = new Omu(ASSET_APP);
    ReplayApp.create(omu, 'asset');
    setClient(omu);

    if (BROWSER) {
        omu.start();
    }
</script>

<AssetPage>
    <AssetApp />
</AssetPage>

<style lang="scss">
    :global(body) {
        background: transparent !important;
    }
</style>
