<script lang="ts">

    import type { Action } from 'svelte/action';
    import { ReplayApp, type Playback, type Video, type VideoInfo } from '../../replay-app.js';

    interface Props {
        video: Extract<Video, { type: 'youtube' }>;
        playback: Playback;
        info: VideoInfo;
        ratio?: number;
        asset?: boolean;
        interacted: boolean;
        loading: boolean;
    }

    let {
        video,
        playback = $bindable(),
        info = $bindable(),
        asset = false,
        interacted = $bindable(),
        loading = $bindable(),
        ratio = 16 / 9,
    }: Props = $props();
    const { config, side } = ReplayApp.getInstance();
    let player: YT.Player | undefined = $state(undefined);
    let width = $state(0);
    let height = $state(0);
    let playerHeight = $derived(height * ratio);
    let padding = $derived((playerHeight - height) / 2);
    let ended = $state(false);

    function onReady(event: YT.PlayerEvent) {
        if (!asset) {
            interacted = false;
            loading = false;
        }
        player = event.target;
        if (asset) {
            player.playVideo();
            player.mute();
        }
    }

    function onPlaybackRateChange(event: YT.OnPlaybackRateChangeEvent) {
        if (side !== 'client') return;
        $config.playbackRate = event.data;
    }

    function onStateChange(event: YT.OnStateChangeEvent) {
        if (event.data === YT.PlayerState.UNSTARTED) {
            loading = true;
        }
        if (event.data === YT.PlayerState.PLAYING) {
            if (!interacted) {
                interacted = true;
                if (!asset) {
                    playback.playing = true;
                    playback.start = Date.now();
                }
                updatePlayback(playback);
            }

            if (asset && !playback.playing) {
                player?.pauseVideo();
                if ($config.muted) {
                    player?.mute();
                } else {
                    player?.unMute();
                }
            }
            ended = false;
        }
        if (event.data === YT.PlayerState.ENDED) {
            ended = true;
            playback.playing = false;
            playback.start = Date.now();
            playback.offset = 0;
        }
    }

    function updatePlayback(playback: Playback) {
        if (!player) return;
        if (!interacted) return;
        const now = Date.now();
        const elapsed = (now - playback.start) / 1000 + playback.offset;
        // player.setPlaybackRate($config.playbackRate);
        player.setPlaybackQuality('hd1080');
        player.seekTo(elapsed, true);
        if (playback.playing) {
            player.playVideo();
        } else {
            player.pauseVideo();
        }
    }

    $effect(() => {
        updatePlayback(playback);
        if (player) {
            info = {
                ...player.getVideoData(),
                duration: player.getDuration(),
            };
        }
    });

    $effect(() => {
        if ($config.muted) {
            player?.mute();
        } else if (asset) {
            player?.unMute();
        }
    });

    function createPlayer(node: HTMLElement) {
        return new YT.Player(node, {
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
    }

    const setup: Action = (node: HTMLElement) => {
        let created = createPlayer(node);
        return {
            update: () => {
                created?.destroy();
                created = createPlayer(node);
            },
            destroy: () => {
                created?.destroy();
                player = undefined;
            },
        };
    };
</script>

<div
    class="container"
    class:interacted={interacted || loading}
    bind:clientWidth={width}
    bind:clientHeight={height}
    style:clip-path={interacted ? `inset(${(height - width / 16 * 9) / 2}px 0px round 2px)` : undefined}
>
    {#key video.id}
        <iframe
            use:setup
            id="player"
            width="{width}px"
            height="{playerHeight}px"
            style:top="{-padding}px"
            src="https://www.youtube.com/embed/{video.id}?enablejsapi=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&origin={location.origin}"
            frameborder="0"
            title="YouTube video player"
            allow="fullscreen"
        ></iframe>
    {/key}
    {#if ended || (!asset && !interacted)}
        <div class="thumbnail" class:asset>
            <img
                src="https://i.ytimg.com/vi/{video.id}/maxresdefault.jpg"
                alt=""
            />
        </div>
    {/if}
</div>

<style lang="scss">
    .container {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        user-select: none;
        align-items: center;
        overflow: hidden;

        &.interacted {
            pointer-events: none;
        }
    }

    iframe {
        position: absolute;
    }

    .thumbnail {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        inset: 0;
        background: var(--color-bg-2);
        user-select: none;
        pointer-events: none;

        > img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        &:not(&.asset) {
            filter: saturate(0.9s) contrast(0.5) brightness(1.5);
        }
    }
</style>
