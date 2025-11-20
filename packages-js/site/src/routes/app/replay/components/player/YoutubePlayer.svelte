<script lang="ts">
    import { run } from 'svelte/legacy';

    import type { Action } from 'svelte/action';
    import { ReplayApp, type Playback, type Video, type VideoInfo } from '../../replay-app.js';

    interface Props {
        video: Extract<Video, { type: 'youtube' }>;
        playback: Playback;
        info: VideoInfo;
        hideOverlay?: boolean;
        heightToWidthRatio?: any;
    }

    let {
        video,
        playback = $bindable(),
        info = $bindable(),
        hideOverlay = false,
        heightToWidthRatio = 9 / 16
    }: Props = $props();
    const { config, side } = ReplayApp.getInstance();
    let player: YT.Player = $state();
    let width = $state(0);
    let height = $state(0);
    let playerWidth = $state(0);
    let playerHeight = $state(0);
    let padding = $state(0);
    let ended = $state(false);

    run(() => {
        if (heightToWidthRatio < 1) {
            playerWidth = width * Math.pow(heightToWidthRatio, 2);
            playerHeight = height / heightToWidthRatio;
            padding = (playerHeight - height) / 2;
        } else {
            playerWidth = width;
            playerHeight = height * heightToWidthRatio;
            padding = (playerHeight - height) / 2;
        }
    });

    let videoLoaded = false;

    function onReady(event: YT.PlayerEvent) {
        player = event.target;
        player.playVideo();
        player.mute();
        const now = Date.now();
        const elapsed = playback.offset + (now - playback.start) / 1000;
        player.setPlaybackRate($config.playbackRate);
        player.seekTo(elapsed, true);
        info = {
            ...player.getVideoData(),
            duration: player.getDuration(),
        };
        videoLoaded = false;
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
        if (event.data === YT.PlayerState.PLAYING) {
            if (!playback.playing && !videoLoaded) {
                player.pauseVideo();
                videoLoaded = true;
            }
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

    run(() => {
        updatePlayback(playback);
    });;
    run(() => {
        if (player && side === 'asset') {
            console.log($config.playbackRate);
            player.setPlaybackRate($config.playbackRate);
        }
    });;

    run(() => {
        if (player && side === 'asset') {
            if ($config.muted) {
                player.mute();
                console.log('muted');
            } else {
                player.unMute();
                console.log('unmuted');
            }
        }
    });

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

    function mapColorKeyValue(value: number) {
        if ($config.filter.type !== 'color_key') return 0.5 - value;
        value = 0.5 - value;
        const { add, sub } = $config.filter;
        if (value > 0) {
            return (sub + add) * value;
        }
        return sub * value;
    }
</script>

<svelte:window
    onkeydown={(event) => {
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
                values="
                    1 0 0 0 0
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
                values="
                    1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 0 1"
            />
        {:else if $config.filter.type === 'color_key'}
            {@const { x, y, z } = $config.filter.color}
            <feColorMatrix
                in="SourceGraphic"
                result="mask1"
                type="matrix"
                values="
                    1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    {mapColorKeyValue(x)} {mapColorKeyValue(y)} {mapColorKeyValue(z)} 1 0"
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
