<script lang="ts">
    import Player from "../components/Player.svelte";
    import { ReplayApp } from "../replay-app.js";

    const { replayData, config } = ReplayApp.getInstance();

    let player: YT.Player;

    function updateReplay() {
        console.log("updateReplay");
        if (!player) return;
        const data = $replayData;
        if (!data) return;
        const timeElapsed = (Date.now() - data.start) / 1000;
        const time = timeElapsed + data.offset;
        player.seekTo(time ?? 0, true);
        if (data.playing) {
            player.playVideo();
        } else {
            player.pauseVideo();
        }
    }

    function updateConfig() {
        if (!player) return;
        player.setPlaybackRate($config.playbackRate);
    }

    let shorts = false;

    async function onReady() {
        player.playVideo();
        player.mute();
        updateReplay();
        if (!$replayData) return;
        const { title } = await fetch(
            "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=" +
                $replayData.videoId,
        )
            .then((res) => res.json())
            .catch(() => {
                throw new Error("Failed to fetch video data");
            });
        shorts = title.includes("#shorts");
    }

    let ended = false;

    function onStateChange(event: YT.OnStateChangeEvent) {
        const player = event.target;
        const state = player.getPlayerState();
        ended = state === YT.PlayerState.ENDED;
        if (state === YT.PlayerState.PLAYING) {
            timer = {
                start: performance.now(),
                time: player.getCurrentTime(),
                duration: player.getDuration(),
            };
            updateTime();
        } else {
            clearTimeout(timeTimeout);
            formattedTime = formatTime(
                player.getCurrentTime(),
                getTimeUnits(player.getDuration()),
            );
        }
    }

    let timeTimeout = 0;
    let timer: {
        start: number;
        time: number;
        duration: number;
    } | null = null;
    let formattedTime = "...";

    type TimeUnit = { factor: number };

    const TIME_UNITS: TimeUnit[] = [
        {
            factor: 60 * 60,
        },
        {
            factor: 60,
        },
        {
            factor: 1,
        },
    ] as const;

    function getTimeUnits(time: number) {
        return TIME_UNITS.filter((unit) => time > unit.factor);
    }

    function formatTime(time: number, units?: TimeUnit[]) {
        units = units ?? getTimeUnits(time);
        const components: string[] = [];
        for (let index = 0; index < units.length; index++) {
            const last = index === 0;
            const unit = units[index];
            components.push(
                Math.floor((time / unit.factor) % 60)
                    .toString()
                    .padEnd(last ? 0 : 2, "0"),
            );
        }
        return components.join(":");
    }

    function updateTime() {
        if (!timer) {
            formattedTime = "...";
            return;
        }
        const { duration } = timer;
        const elapsed = performance.now() - timer.start;
        const time = timer.time + elapsed / 1000;
        formattedTime = formatTime(time, getTimeUnits(duration));
        timeTimeout = window.setTimeout(
            () => updateTime(),
            (1 - (time % 1)) * 1000,
        );
    }

    replayData.subscribe(() => {
        updateReplay();
        console.log("replayData", $replayData);
    });
    config.subscribe(() => updateConfig());
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <link
        href="https://fonts.googleapis.com/css2?family=Google+Sans+Code:ital,wght@0,300..800;1,300..800&display=swap"
        rel="stylesheet"
    />
</svelte:head>
time
<main>
    <div
        class="player"
        class:hide={$config.overlay.active && $config.overlay.hideVideo}
    >
        <Player
            videoId={$replayData?.videoId}
            bind:player
            options={{
                events: {
                    onReady,
                    onStateChange,
                },
            }}
            hideOverlay
            heightToWidthRatio={shorts ? 9 / 16 : 16 / 9}
        />
    </div>
    <div class="thumbnail-overlay" class:show={ended}>
        <img
            src="https://i.ytimg.com/vi/{$replayData?.videoId}/maxresdefault.jpg"
            alt=""
        />
    </div>
    {#if $config.overlay.active}
        {#if !$config.overlay.hideVideo}
            <div
                class="time-overlay"
                style:background={{
                    start: "linear-gradient(to bottom, #0008 0%, transparent 50%)",
                    middle: "linear-gradient(to top, transparent 0%, #0004 50%, transparent 100%)",
                    end: "linear-gradient(to top, #0008 0%, transparent 50%)",
                }[$config.overlay.align.vertical]}
            ></div>
        {/if}
        <div
            class="align"
            style:align-items={{
                start: "flex-start",
                middle: "center",
                end: "flex-end",
            }[$config.overlay.align.horizontal]}
            style:justify-content={{
                start: "flex-end",
                middle: "center",
                end: "flex-end",
            }[$config.overlay.align.vertical]}
            style:flex-direction={{
                start: "column-reverse",
                middle: "column",
                end: "column",
            }[$config.overlay.align.vertical]}
        >
            {#if $config.overlay.title}
                <div class="title">
                    {#if player}
                        {player.getVideoData().title}
                    {/if}
                </div>
            {/if}
            {#if $config.overlay.time.active}
                <div class="time">
                    {#if timer}
                        {formattedTime}
                        {#if $config.overlay.time.duration}
                            <small> / {formatTime(timer.duration)}</small>
                        {/if}
                    {/if}
                </div>
            {/if}
        </div>
    {/if}
</main>

<style lang="scss">
    main {
        position: fixed;
        inset: 0;
        font-family: "Google Sans Code", monospace;
        font-optical-sizing: auto;
    }

    :global(body) {
        background: transparent !important;
    }

    .player {
        position: absolute;
        inset: 0;

        &.hide {
            visibility: hidden;
        }
    }

    .thumbnail-overlay {
        position: absolute;
        inset: 0;
        display: none;
        background: rgba(0, 0, 0, 0.5);
        justify-content: center;
        align-items: center;

        > img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
    }

    .time-overlay {
        position: absolute;
        inset: 0;
        mix-blend-mode: multiply;
    }

    .align {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        padding: 1rem 2.621rem;
        padding-top: 3rem;
        gap: 1.5rem;
    }

    .title {
        height: fit-content;
        color: #fff;
        font-size: 2rem;
        font-weight: 600;
        font-style: normal;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        text-wrap: nowrap;
    }

    .time {
        height: fit-content;
        color: #fff;
        font-size: 3rem;
        font-weight: 600;
        font-style: normal;

        > small {
            font-weight: 200;
            font-size: 1.621rem;
        }
    }

    .thumbnail-overlay.show {
        display: flex;
    }
</style>
