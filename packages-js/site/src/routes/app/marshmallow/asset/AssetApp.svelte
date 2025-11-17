<script lang="ts">
    import { lerp01 } from '$lib/math/math';
    import { OmuPermissions, type Omu } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import MarshmallowRenderer from '../_components/MarshmallowRenderer.svelte';
    import { MarshmallowApp } from '../marshmallow-app';

    export let omu: Omu;

    const marshmallow = new MarshmallowApp(omu);
    const { config, data } = marshmallow;

    if (BROWSER) {
        omu.permissions.require(
            OmuPermissions.ASSET_DOWNLOAD_PERMISSION_ID,
        );
        omu.start();
    }

    const PADDING = 100;
    let imageWidth = 1;
    let imageHeight = 1;
    let windowWidth = 1;
    let windowHeight = 1;
    $: scale = Math.exp($config.scale * 0.5);
    $: width = imageWidth;
    $: height = imageHeight;
</script>

<svelte:window bind:innerWidth={windowWidth} bind:innerHeight={windowHeight} />

<main>
    {#if $data.message}
        <div
            class="container"
            class:hide={width <= 0}
            style="transform: translateY({lerp01(PADDING, Math.min(PADDING, windowHeight - height - PADDING), $data.scroll)}px); left: {windowWidth / 2 + -width / scale / 2}px;"
        >
            {#key $data.message.id}
                <div class="marshmallow">
                    <MarshmallowRenderer
                        message={$data.message}
                        targetWidth={600 * scale} bind:width={imageWidth} bind:height={imageHeight}
                        pointer={$data.pointer}
                    />
                </div>
            {/key}
        </div>
    {/if}
</main>

<style lang="scss">
    :global(body) {
        background: transparent !important;
    }

    main {
        position: absolute;
        inset: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        padding-top: 4rem;
        overflow: hidden;
    }

    .container {
        position: absolute;
        inset: 0;

        &.hide {
            visibility: hidden;
        }
    }

    .marshmallow {
        position: absolute;
        left: 0;
        top: 0;
        display: flex;
        align-items: start;
        justify-content: center;
        transform-origin: left top;
    }
</style>
