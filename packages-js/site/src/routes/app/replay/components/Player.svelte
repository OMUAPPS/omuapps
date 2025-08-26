<script lang="ts">
    import { ReplayApp } from "../replay-app.js";

    export let videoId: string | undefined;
    export let player: YT.Player | undefined = undefined;
    export let options: YT.PlayerOptions = {};
    export let hideOverlay = false;
    export let iframe: HTMLIFrameElement | undefined = undefined;
    export let heightToWidthRatio = 9 / 16;
    const initialVideoId = videoId;
    const { config, side } = ReplayApp.getInstance();

    let width = 0;
    let height = 0;
    let playerWidth = 0;
    let playerHeight = 0;
    let padding = 0;

    $: {
        if (heightToWidthRatio < 1) {
            playerWidth = width * Math.pow(heightToWidthRatio, 2);
            playerHeight = height / heightToWidthRatio;
            padding = (playerHeight - height) / 2;
        } else {
            playerWidth = width;
            playerHeight = height * heightToWidthRatio;
            padding = (playerHeight - height) / 2;
        }
    }

    function createPlayer() {
        if (!iframe) return;
        if (player) {
            player.destroy();
            player = undefined;
        }
        new YT.Player(iframe, {
            ...options,
            events: {
                ...options.events,
                onReady: (event) => {
                    player = event.target;
                    options.events?.onReady?.(event);
                },
            },
        });
    }

    $: {
        if (iframe) {
            console.log(iframe, videoId);
            createPlayer();
        }
    }

    $: {
        if (videoId !== initialVideoId) {
            if (player && videoId) {
                player.loadVideoById(videoId);
            }
        }
    }

    function toggle() {
        if (!player) return;
        if (player.getPlayerState() === YT.PlayerState.PAUSED) {
            player.playVideo();
        } else {
            player.pauseVideo();
        }
    }
</script>

<svelte:window
    on:keydown={(event) => {
        if (!player) return;
        switch (event.key) {
            case " ":
            case "k":
                toggle();
                break;
            case "ArrowLeft":
                player.seekTo(player.getCurrentTime() - 5, true);
                break;
            case "ArrowRight":
                player.seekTo(player.getCurrentTime() + 5, true);
                break;
            case "j":
                player.seekTo(player.getCurrentTime() - 10, true);
                break;
            case "l":
                player.seekTo(player.getCurrentTime() + 10, true);
                break;
            case "m":
                if (player.isMuted()) {
                    player.unMute();
                } else {
                    player.mute();
                }
                break;
            default:
                break;
        }
    }}
/>
<svg>
    <filter id="filter" x="0" y="0">
        {#if $config.filter.type === "pixelate"}
            <feFlood x="4" y="4" height="1" width="1" />
            <feComposite
                width={$config.filter.radius * 2}
                height={$config.filter.radius * 2}
            />
            <feTile result="a" />
            <feComposite in="SourceGraphic" in2="a" operator="in" />
            <feMorphology operator="dilate" radius={$config.filter.radius} />
            <feColorMatrix
                type="matrix"
                values="1 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        0 0 0 0 1"
            />
        {:else if $config.filter.type === "blur"}
            <feFlood x="4" y="4" height="1" width="1" />
            <feGaussianBlur
                in="SourceGraphic"
                stdDeviation={$config.filter.radius}
            />
            <feColorMatrix
                type="matrix"
                values="1 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        0 0 0 0 1"
            />
        {/if}
    </filter>
</svg>
<div
    bind:clientWidth={width}
    bind:clientHeight={height}
    style={(side === "asset" && "filter: url(#filter)") || ""}
>
    {#if videoId}
        {#key videoId}
            {#if hideOverlay}
                <iframe
                    bind:this={iframe}
                    id="player"
                    width={playerWidth}
                    height={playerHeight}
                    style:top="{-padding}px"
                    style:clip-path="inset({padding}px 0 {padding}px 0)"
                    src="https://www.youtube.com/embed/{initialVideoId}?enablejsapi=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1"
                    frameborder="0"
                    title="YouTube video player"
                    allow="fullscreen"
                ></iframe>
            {:else}
                <iframe
                    bind:this={iframe}
                    id="player"
                    {width}
                    {height}
                    src="https://www.youtube.com/embed/{initialVideoId}?enablejsapi=1&rel=0&modestbranding=1"
                    frameborder="0"
                    title="YouTube video player"
                    allow="fullscreen"
                ></iframe>
            {/if}
        {/key}
    {/if}
</div>

<style lang="scss">
    svg {
        position: absolute;
    }

    div {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    iframe {
        position: absolute;
    }
</style>
