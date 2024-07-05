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

    let image: HTMLImageElement;

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
                    style="transform: translateY(-{$config.syncScroll ? $data.scroll * 100 : 0}%);"
                    bind:this={image}
                />
                {#if image && $config.showPointer && $data.pointer}
                    {@const pointer = $data.pointer}
                    <div
                        class="pointer-container"
                        style="
                                transform: translateY(-{$config.syncScroll
                            ? $data.scroll * 100
                            : 0}%);
                                width: {image.clientWidth}px;
                                height: {image.clientHeight}px;"
                    >
                        <i
                            class="pointer ti ti-pointer-filled"
                            style="
                                    left: {pointer.x * image.clientWidth}px;
                                    top: {pointer.y * image.clientHeight}px;"
                        >
                        </i>
                    </div>
                {/if}
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
        align-items: center;
        overflow: hidden;
    }

    img {
        position: absolute;
    }

    .pointer-container {
        position: absolute;
    }

    .pointer {
        position: absolute;
        transform: translate(-25%, -25%);
        width: 20px;
        height: 20px;
        -webkit-text-stroke: 3px #fff;
        color: var(--color-1);
        font-size: 2rem;
    }

    .async {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
    }
</style>
