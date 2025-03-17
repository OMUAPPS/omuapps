<script lang="ts">
    import type { Omu } from '@omujs/omu';
    import type { RemoteApp } from '../remote-app.js';

    export let omu: Omu;
    export let remote: RemoteApp;
    const { config } = remote;

    $: align = $config.asset.align;

    const ALIGN = {
        'start': 'flex-start',
        'middle': 'center',
        'end': 'flex-end',
    }
</script>

<main>
    {#if $config.show}
        {@const { show } = $config}
        <div
            class="asset"
            style:align-items={ALIGN[align.y]}
            style:justify-content={ALIGN[align.x]}
        >
            <img src={omu.assets.url(show.asset)} 
                style:object-fit={$config.asset.scaling} alt="">
        </div>
    {/if}
</main>

<style lang="scss">
    main {
        position: fixed;
        inset: 0;
    }

    .asset {
        position: absolute;
        inset: 0;
        display: flex;
    }

    img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
</style>
