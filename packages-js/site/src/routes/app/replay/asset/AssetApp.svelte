<script lang="ts">

    import type { Omu } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import { onMount } from 'svelte';
    import TwitchPlayer from '../components/player/TwitchPlayer.svelte';
    import YoutubePlayer from '../components/player/YoutubePlayer.svelte';
    import { ReplayApp } from '../replay-app.js';

    interface Props {
        omu: Omu;
    }

    let { omu }: Props = $props();
    const { replayData, config } = ReplayApp.create(omu, 'asset');

    if (BROWSER) {
        omu.start();
    }

    let timeTimeout = $state(0);
    let timer: {
        start: number;
        time: number;
        duration?: number;
    } | null = $state(null);
    let formattedTime = $state('...');

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
        if (!$replayData?.playback.playing) return;
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

    replayData.subscribe((replayData) => {
        if (!replayData) return;
        timer = {
            start: replayData.playback.start,
            time: replayData.playback.offset,
            duration: replayData.info.duration,
        };
        if (replayData.playback.playing) {
            updateTime();
        }
    });
    replayData.subscribe((replayData) => {
        if (!replayData) return;
        if (!replayData.playback.playing) {
            clearTimeout(timeTimeout);
        }
    });
    onMount(() => {
        if (!$replayData) return;
        $replayData.playback.playing = false;
    });

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

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <link
        href="https://fonts.googleapis.com/css2?family=Google+Sans+Code:ital,wght@0,300..800;1,300..800&display=swap"
        rel="stylesheet"
    />
</svelte:head>

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
<main>
    {#if $replayData}
        <div
            class="player"
            class:hide={$config.overlay.hideVideo}
            style="filter: url(#filter)">
            {#if $replayData.video.type === 'youtube'}
                <YoutubePlayer
                    video={$replayData.video}
                    playback={$replayData.playback}
                    info={$replayData.info}
                    interacted={false}
                    loading={false}
                    asset
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
