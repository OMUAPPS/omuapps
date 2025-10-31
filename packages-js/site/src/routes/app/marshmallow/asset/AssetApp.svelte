<script lang="ts">
    import type { Omu } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import { fade } from 'svelte/transition';
    import { MarshmallowApp } from '../marshmallow-app';

    export let omu: Omu;

    const marshmallow = new MarshmallowApp(omu);
    const { config, data } = marshmallow;

    let image: HTMLImageElement;

    if (BROWSER) {
        omu.start();
    }
</script>

<main>
    {#if $data.message}
        <img
            src="https://media.marshmallow-qa.com/system/images/{$data.message
                .id}.png"
            style:transform="translateY(-{$data.scroll * 100}%)"
            bind:this={image}
            alt=""
        />
        {#if image && $data.pointer}
            {@const pointer = $data.pointer}
            <div
                class="pointer-container"
                style:width="{image.clientWidth}px"
                style:height="{image.clientHeight}px"
                style:transform="translateY(-{$data.scroll * 100}%)"
                in:fade={{ duration: 1000 / 60 * 3 }}
                out:fade={{ duration: 1000 / 60 * 1 }}
            >
                <i
                    class="pointer ti ti-pointer-filled"
                    style:left="{pointer.x * image.clientWidth}px"
                    style:top="{pointer.y * image.clientHeight}px"
                >
                </i>
            </div>
        {/if}
    {/if}
</main>

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

    img {
        position: absolute;
        box-shadow: 0 0 1rem 0 rgba(0, 0, 0, 0.1);
    }

    .pointer-container {
        position: absolute;
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

    .async {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
    }
</style>
