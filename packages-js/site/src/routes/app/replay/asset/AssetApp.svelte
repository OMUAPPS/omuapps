<script lang="ts">
    import type { Omu } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import TwitchPlayer from '../components/player/TwitchPlayer.svelte';
    import YoutubePlayer from '../components/player/YoutubePlayer.svelte';
    import { ReplayApp } from '../replay-app.js';

    export let omu: Omu;
    const { replayData, config } = ReplayApp.create(omu, 'asset');

    if (BROWSER) {
        omu.start();
    }

    let timeTimeout = 0;
    let timer: {
        start: number;
        time: number;
        duration?: number;
    } | null = null;
    let formattedTime = '...';

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
                    .padStart(last ? 0 : 2, '0'),
            );
        }
        return components.join(':');
    }

    function updateTime() {
        if (!timer) {
            formattedTime = '...';
            return;
        }
        const { duration, start } = timer;
        const elapsed = (performance.now() + performance.timeOrigin) - start;
        const time = timer.time + elapsed / 1000;
        formattedTime = formatTime(time, duration ? getTimeUnits(duration) : undefined);
        timeTimeout = window.setTimeout(
            () => updateTime(),
            (1 - (time % 1)) * 1000,
        );
    }

    $: if ($replayData) {
        timer = {
            start: $replayData.playback.start,
            time: $replayData.playback.offset,
            duration: $replayData.info.duration,
        };
        if ($replayData.playback.playing) {
            updateTime();
        } else {
            clearTimeout(timeTimeout);
        }
    }
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <link
        href="https://fonts.googleapis.com/css2?family=Google+Sans+Code:ital,wght@0,300..800;1,300..800&display=swap"
        rel="stylesheet"
    />
</svelte:head>

<main>
    {#if $replayData}
        <div class="player" class:hide={$config.overlay.hideVideo}>
            {#if $replayData.video.type === 'youtube'}
                <YoutubePlayer
                    video={$replayData.video}
                    playback={$replayData.playback}
                    info={$replayData.info}
                    hideOverlay
                    heightToWidthRatio={16 / 9}
                />
            {:else if $replayData.video.type === 'twitch'}
                <TwitchPlayer
                    video={$replayData.video}
                    playback={$replayData.playback}
                />
            {/if}
        </div>
        {#if $config.overlay.active}
            {#if !$config.overlay.hideVideo}
                <div
                    class="time-overlay"
                    style:background={{
                        start: 'linear-gradient(to bottom, #0008 0%, transparent 50%)',
                        middle: 'linear-gradient(to top, transparent 0%, #0004 50%, transparent 100%)',
                        end: 'linear-gradient(to top, #0008 0%, transparent 50%)',
                    }[$config.overlay.align.vertical]}
                ></div>
            {/if}
            <div
                class="align"
                style:align-items={{
                    start: 'flex-start',
                    middle: 'center',
                    end: 'flex-end',
                }[$config.overlay.align.horizontal]}
                style:justify-content={{
                    start: 'flex-end',
                    middle: 'center',
                    end: 'flex-end',
                }[$config.overlay.align.vertical]}
                style:flex-direction={{
                    start: 'column-reverse',
                    middle: 'column',
                    end: 'column',
                }[$config.overlay.align.vertical]}
            >
                {#if $config.overlay.title}
                    {#key $replayData.video}
                        <div class="title">
                            {#if $replayData.info.title}
                                {$replayData.info.title}
                            {/if}
                        </div>
                    {/key}
                {/if}
                {#if $config.overlay.time.active}
                    <div class="time">
                        {#if timer}
                            {formattedTime}
                            {#if $config.overlay.time.duration && timer.duration}
                                <small> / {formatTime(timer.duration)}</small>
                            {/if}
                        {/if}
                    </div>
                {/if}
            </div>
        {/if}
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
</style>
