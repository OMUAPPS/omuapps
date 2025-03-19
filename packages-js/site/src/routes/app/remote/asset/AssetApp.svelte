<script lang="ts">
    import type { Omu } from '@omujs/omu';
    import type { RemoteApp, Scaler } from '../remote-app.js';

    export let omu: Omu;
    export let remote: RemoteApp;
    const { config } = remote;

    $: align = $config.asset.align;

    const ALIGN = {
        'start': 'flex-start',
        'middle': 'center',
        'end': 'flex-end',
    }

    function calculateScaler(scaling: Scaler): string {
        switch (scaling.type) {
            case 'percent':
                return `${scaling.value}%`;
            case 'pixel':
                return `${scaling.value}px`;
            default:
                throw new Error(`Unknown scaling type: ${scaling}`);
        }
    }

    let image: HTMLImageElement;
</script>

<main>
    {#if $config.show}
        {@const { show } = $config}
        {@const scaling = $config.asset.scaling}
        <div
            class="asset"
            style:align-items={ALIGN[align.y]}
            style:justify-content={ALIGN[align.x]}
        >
            {#if scaling.type === 'stretch'}
                {@const { width, height } = scaling}
                <img
                    bind:this={image}
                    src={omu.assets.url(show.asset)}
                    style:width={calculateScaler(width)}
                    style:height={calculateScaler(height)}
                    alt=""
                >
            {:else}
                <img
                    bind:this={image}
                    src={omu.assets.url(show.asset)} 
                    style:object-fit={$config.asset.scaling.type}
                    alt=""
                >
            {/if}
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
    }
</style>
