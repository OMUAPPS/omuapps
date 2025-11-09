<script lang="ts">
    import { lerp01 } from '$lib/math/math';
    import type { Omu } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import { MarshmallowApp } from '../marshmallow-app';

    export let omu: Omu;

    const marshmallow = new MarshmallowApp(omu);
    const { config, data } = marshmallow;

    if (BROWSER) {
        omu.start();
    }

    const PADDING = 100;
    let image: HTMLImageElement;
    let imageWidth = 1;
    let imageHeight = 1;
    let windowWidth = 1;
    let windowHeight = 1;
    $: scale = Math.exp($config.scale * 0.5);
    $: width = imageWidth * scale;
    $: height = imageHeight * scale;
</script>

<svelte:window bind:innerWidth={windowWidth} bind:innerHeight={windowHeight} />

<main>
    {#if $data.message}
        <div class="container" class:hide={!image || width <= 0} style="transform: translateY({lerp01(PADDING, Math.min(PADDING, windowHeight - height - PADDING), $data.scroll)}px); left: {(windowWidth - width) / 2}px;">
            {#key $data.message.id}
                <div class="image-container" bind:clientWidth={imageWidth} bind:clientHeight={imageHeight}>
                    <img
                        src="https://media.marshmallow-qa.com/system/images/{$data.message
                            .id}.png"
                        alt=""
                        class="hide"
                        bind:this={image}
                    />
                    <img
                        src="https://media.marshmallow-qa.com/system/images/{$data.message
                            .id}.png"
                        alt=""
                        class="display"
                        style="scale: {scale};"
                        bind:this={image}
                    />
                </div>
            {/key}
            {#if $data.pointer}
                {@const pointer = $data.pointer}
                <i
                    class="pointer ti ti-pointer-filled"
                    style:left="{pointer.x * width}px"
                    style:top="{pointer.y * height}px"
                >
                </i>
            {/if}
        </div>
    {/if}
</main>

<style lang="scss">
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

    .container {
        position: absolute;
        inset: 0;

        &.hide {
            visibility: hidden;
        }
    }

    .image-container {
        position: absolute;
        top: 0;
        left: 0;

        > .hide {
            visibility: hidden;
        }

        > .display {
            position: absolute;
            left: 0;
            top: 0;
            transform-origin: left top;
        }
    }

    .pointer {
        position: absolute;
        transform: translate(-25%, -25%);
        width: 20px;
        height: 20px;
        -webkit-text-stroke: 2.5px #fff;
        color: var(--color-1);
        font-size: 2.6rem;
        text-shadow: rgba(0, 0, 0, 0.5) 2px 2px 5px;
    }
</style>
