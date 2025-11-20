<script lang="ts">
    import { lerp01 } from '$lib/math/math';
    import { OmuPermissions, type Omu } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import MarshmallowRenderer from '../_components/MarshmallowRenderer.svelte';
    import { MarshmallowApp } from '../marshmallow-app';

    interface Props {
        omu: Omu;
    }

    let { omu }: Props = $props();

    const marshmallow = new MarshmallowApp(omu);
    const { config, data } = marshmallow;

    if (BROWSER) {
        omu.permissions.require(
            OmuPermissions.ASSET_PERMISSION_ID,
        );
        omu.start();
    }

    const PADDING = 100;
    let imageWidth = $state(1);
    let imageHeight = $state(1);
    let windowWidth = $state(1);
    let windowHeight = $state(1);
    let scale = $derived(Math.exp($config.scale * 0.5));
    let width = $derived(imageWidth);
    let height = $derived(imageHeight);
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
