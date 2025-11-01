<script lang="ts">
    import type { Action } from 'svelte/action';
    import { ReplayApp, type Playback, type Video, type VideoInfo } from '../../replay-app.js';

    export let video: Extract<Video, { type: 'youtube' }>;
    export let playback: Playback;
    export let info: VideoInfo;
    export let hideOverlay = false;
    export let heightToWidthRatio = 9 / 16;
    const { config, side } = ReplayApp.getInstance();
    let player: YT.Player;
    let width = 0;
    let height = 0;
    let playerWidth = 0;
    let playerHeight = 0;
    let padding = 0;
    let ended = false;

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

    function onReady(event: YT.PlayerEvent) {
        player = event.target;
        if (playback.playing) {
            player.playVideo();
        } else {
            player.pauseVideo();
        }
        const now = Date.now();
        const elapsed = playback.offset + (now - playback.start) / 1000;
        player.setPlaybackRate($config.playbackRate);
        player.seekTo(elapsed, true);
        info = {
            ...player.getVideoData(),
            duration: player.getDuration() * 1000,
        };
    }

    function onPlaybackRateChange(event: YT.OnPlaybackRateChangeEvent) {
        if (side !== 'client') return;
        $config.playbackRate = event.data;
    }

    function onStateChange(event: YT.OnStateChangeEvent) {
        if (!player) return;
        ended = event.data === YT.PlayerState.ENDED;
        if (event.data === YT.PlayerState.BUFFERING) {
            return;
        }
        if (event.data === YT.PlayerState.UNSTARTED) {
            if (playback.playing) {
                player.playVideo();
            }
            return;
        }
        const playing = event.data === YT.PlayerState.PLAYING;
        if (side === 'asset' && playing && !playback.playing) {
            player.pauseVideo();
        }
        if (side === 'asset') return;
        const time = player.getCurrentTime();
        playback = {
            offset: time,
            start: Date.now(),
            playing,
        };
    }

    function updatePlayback(playback: Playback) {
        if (side === 'client') return;
        if (!player) return;
        const now = Date.now();
        const elapsed = playback.offset + (now - playback.start) / 1000;
        player.setPlaybackRate($config.playbackRate);
        player.seekTo(elapsed, true);
        if (playback.playing) {
            player.playVideo();
        } else {
            player.pauseVideo();
        }
    }

    $: {
        console.log(playback);
        updatePlayback(playback);
    };
    $: {
        if (player && side === 'asset') {
            console.log($config.playbackRate);
            player.setPlaybackRate($config.playbackRate);
        }
    };

    $: {
        if (player && side === 'asset') {
            if ($config.muted) {
                player.mute();
                console.log('muted');
            } else {
                player.unMute();
                console.log('unmuted');
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

    const setup: Action = (node) => {
        new YT.Player(node, {
            videoId: video.id,
            playerVars: {
                'origin': location.origin,
            },
            events: {
                onReady,
                onPlaybackRateChange,
                onStateChange,
            },
        });
    };
</script>

<svelte:window
    on:keydown={(event) => {
        if (!player) return;
        switch (event.key) {
            case ' ':
            case 'k':
                toggle();
                break;
            case 'ArrowLeft':
                player.seekTo(player.getCurrentTime() - 5, true);
                break;
            case 'ArrowRight':
                player.seekTo(player.getCurrentTime() + 5, true);
                break;
            case 'j':
                player.seekTo(player.getCurrentTime() - 10, true);
                break;
            case 'l':
                player.seekTo(player.getCurrentTime() + 10, true);
                break;
            case 'm':
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
        {#if $config.filter.type === 'pixelate'}
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
        {:else if $config.filter.type === 'blur'}
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
    style={(side === 'asset' && 'filter: url(#filter)') || ''}
>
    {#if video}
        {#key video.id}
            {#if hideOverlay}
                <iframe
                    use:setup
                    id="player"
                    width={playerWidth}
                    height={playerHeight}
                    style:top="{-padding}px"
                    style:clip-path="inset({padding}px 0 {padding}px 0)"
                    src="https://www.youtube.com/embed/{video.id}?enablejsapi=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&origin={location.origin}"
                    frameborder="0"
                    title="YouTube video player"
                    allow="fullscreen"
                ></iframe>
            {:else}
                <iframe
                    use:setup
                    id="player"
                    {width}
                    {height}
                    src="https://www.youtube.com/embed/{video.id}?enablejsapi=1&rel=0&modestbranding=1&origin={location.origin}"
                    frameborder="0"
                    title="YouTube video player"
                    allow="fullscreen"
                ></iframe>
            {/if}
        {/key}
        {#if ended && side === 'asset'}
            <div class="thumbnail">
                <img
                    src="https://i.ytimg.com/vi/{video.id}/maxresdefault.jpg"
                    alt=""
                />
            </div>
        {/if}
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

    .thumbnail {
        display: flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        inset: 0;
        background: #000;

        > img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
    }
</style>
