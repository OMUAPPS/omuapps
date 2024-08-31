<script lang="ts">
    export let videoId: string | undefined;
    export let player: YT.Player | undefined = undefined;
    export let options: YT.PlayerOptions = {};
    export let hide = false;
    export let iframe: HTMLIFrameElement | undefined = undefined;
    export let heightToWidthRatio = 9/16;
    const initialVideoId = videoId;

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
</script>

<div bind:clientWidth={width} bind:clientHeight={height}>
    {#if videoId}
        {#key videoId}
            {#if hide}
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
                ></iframe>
            {/if}
        {/key}
    {/if}
</div>

<style lang="scss">
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
