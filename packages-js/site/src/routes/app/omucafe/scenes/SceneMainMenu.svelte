<script lang="ts">
    import { Interval } from '$lib/helper.js';
    import AssetImage from '../components/AssetImage.svelte';
    import { EXAMPLE } from '../example/example.js';
    import button_line from '../images/button_line.png';
    import photo_placeholder from '../images/photo_placeholder.png';
    import title from '../images/title.svg';
    import { getGame, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    $: console.log('SceneMainMenu', context);

    const { scene, gameConfig: config, gallery } = getGame();

    const latestGalleryItems = gallery.fetchItems({
        limit: 30,
        backward: true,
    });

    const galleryInterval = new Interval(1000 * 10).start();
</script>

<svelte:window on:keydown={(event) => {
    if (!context.active) return;
    if (event.key === 'Escape') {
        $scene = { type: 'cooking' };
    }
}} />
<div class="container">
    <div class="actions">
        <img src={title} alt="OMU CAFE" class="title" />
        <button on:click={() => {
            $scene = { type: 'cooking' };
        }}>
            <img src={button_line} alt="">
            <i class="ti ti-tools-kitchen-3"></i>
            <span>お店を開く</span>
            <i class="ti ti-chevron-right"></i>
        </button>
        <button on:click={() => {
            $scene = { type: 'kitchen_edit' };
        }}>
            <img src={button_line} alt="">
            <i class="ti ti-hammer"></i>
            <span>キッチンの整理</span>
            <i class="ti ti-chevron-right"></i>
        </button>
        <button on:click={() => {
            $scene = { type: 'product_list' };
        }}>
            <img src={button_line} alt="">
            <i class="ti ti-receipt"></i>
            <span>メニュー</span>
            <i class="ti ti-chevron-right"></i>
        </button>
        <button on:click={() => {
            $config = EXAMPLE;
            console.log($config);
        }}>
            <img src={button_line} alt="">
            <i class="ti ti-settings-x"></i>
            <span>設定をリセット</span>
            <i class="ti ti-chevron-right"></i>
        </button>
    </div>
    {#await latestGalleryItems then items}
        {#if items.size > 0}
            {@const index = $galleryInterval % items.size}
            {@const item = [...items.values()][index]}
            <button class="gallery" on:click={() => {
                $scene = { type: 'gallery' };
            }}>
                {#key index}
                    <AssetImage asset={item.asset} let:src>
                        <img class="image" {src} alt="" />
                    </AssetImage>
                {/key}
                <div class="go-gallery">
                    写真を見返す
                    <i class="ti ti-chevron-right"></i>
                </div>
            </button>
        {:else}
            <div class="gallery">
                <img class="image" src={photo_placeholder} alt="No photos" />
            </div>
        {/if}
    {/await}
</div>

<style lang="scss">
    .container {
        position: absolute;
        background: linear-gradient(
            in oklab to right,
            rgba(246, 242, 235, 1) 0%,
            rgba(246, 242, 235, 0.8) 70%,
            rgba(246, 242, 235, 0.4) 100%
        );
        inset: 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0% 10%;
    }

    .title {
        width: 30rem;
        margin-bottom: 4rem;
        transform: translateX(-2rem);
    }

    .actions {
        display: flex;
        flex-direction: column;
        transform: matrix(1, 0, 0.08621, 1, 0, 0);
    }

    .gallery {
        position: relative;
        display: flex;
        background: none;
        border: none;
        width: 50%;
        height: 40%;
        font-weight: 600;

        > .image {
            filter: drop-shadow(1rem 0.5rem 0 color-mix(in srgb, var(--color-outline) 50%, transparent 0%));
            border: 1rem solid var(--color-bg-2);
            animation: forwards galleryPhoto 1s ease-out;
            animation-delay: 0.5s;
            transform: rotate(3deg);
            opacity: 0;
            position: absolute;
            width: 100%;
            object-fit: contain;
        }

        > .go-gallery {
            position: absolute;
            display: none;
            top: 50%;
            right: 10%;
            font-size: 2rem;
            background: var(--color-1);
            color: var(--color-bg-2);
            padding: 1rem 2rem;
            transform: skew(-6deg);
        }
    }

    button.gallery:hover {
        cursor: pointer;

        > .go-gallery {
            display: block;
            animation: forwards galleryHoverTooltip 0.1621s ease-out;
        }

        animation: forwards galleryHover 0.1621s ease-out;
    }

    @keyframes galleryPhoto {
        0% {
            opacity: 0;
            transform: translateY(-1rem) rotate(3deg);
        }
        100% {
            opacity: 1;
            transform: translateY(0) rotate(3deg);
        }
    }

    @keyframes galleryHover {
        0% {
            transform: translateY(0);
        }
        36.21% {
            transform: translateY(-1.5rem);
            opacity: 0.8;
            filter: contrast(1.2);
        }
        100% {
            transform: translateY(-1rem);
            filter: contrast(0.8) brightness(1.1);
        }
    }

    @keyframes galleryHoverTooltip {
        0% {
            transform: translateX(0) rotate(-10deg) skew(-6deg);
            opacity: 0;
        }
        36.21% {
            transform: translateX(1.5rem) rotate(-8deg) skew(-6deg);
            opacity: 1;
        }
        100% {
            transform: translateX(1rem) rotate(-10deg) skew(-6deg);
        }
    }

    .actions > button {
        position: relative;
        padding: 1.25rem 1rem;
        background: transparent;
        color: var(--color-text);
        border: none;
        cursor: pointer;
        font-size: 1.2rem;
        font-weight: 600;
        text-align: left;
        display: flex;
        align-items: baseline;
        width: 20rem;

        &:focus,
        &:hover {
            animation: hover 0.1621s ease-in-out;
            animation-fill-mode: forwards;
            outline: none;
            color: var(--color-1);

            > img {
                visibility: visible;
                animation: clip 0.0621s ease-in-out;
                animation-fill-mode: forwards;
            }

            > span {
                animation: flip 0.1621s ease-in-out;
                animation-fill-mode: forwards;
            }

            > .ti-chevron-right {
                visibility: visible;
                animation: clip 0.0621s chevron;
                animation-fill-mode: forwards;
            }
        }

        > i {
            font-size: 1.2rem;
            margin-right: 0.75rem;
        }

        > img {
            position: absolute;
            bottom: 0.75rem;
            left: 0;
            pointer-events: none;
            width: 90%;
            height: 0.5rem;
            visibility: hidden;
        }

        > .ti-chevron-right {
            margin-left: auto;
            margin-right: 1rem;
            visibility: hidden;
        }
    }

    @keyframes hover {
        0% {
            transform: translateX(0);
            color: var(--color-bg-2);
        }
        10% {
            transform: translateX(-0.1rem);
        }
        60% {
            transform: translateX(0.26rem);
        }
        100% {
            transform: translateX(0.25rem);
        }
    }

    @keyframes flip {
        0% {
            transform: scaleY(0);
        }
        20% {
            transform: scaleY(0.8);
        }
        100% {
            transform: scaleY(1);
        }
    }

    @keyframes clip {
        0% {
            clip-path: polygon(0 0, 0% 0, 100% 100%, 0 100%);
        }
        100% {
            clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
        }
    }

    @keyframes chevron {
        0% {
            transform: scaleY(0);
            opacity: 0;
        }
        100% {
            transform: translateX(-0.5rem);
            opacity: 1;
        }
    }
</style>
