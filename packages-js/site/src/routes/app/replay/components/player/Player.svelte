<script lang="ts">
    import { clamp } from '$lib/math/math';
    import { PopupPortal, Spinner, Tooltip, TooltipPortal } from '@omujs/ui';
    import { onMount } from 'svelte';
    import { fly } from 'svelte/transition';
    import { ReplayApp, type Playback, type ReplayData } from '../../replay-app';
    import TwitchPlayer from './TwitchPlayer.svelte';
    import YoutubePlayer from './YoutubePlayer.svelte';

    interface Props {
        replayData: ReplayData;
        playback: Playback;
    }

    let { replayData = $bindable(), playback = $bindable() }: Props = $props();

    const replay = ReplayApp.getInstance();
    const { config } = replay;

    let now = $state(0);
    let lastActionTime = $state(0);
    let updateHandle = 0;

    function updateTime() {
        now = Date.now();
        updateHandle = requestAnimationFrame(() => updateTime());
    }

    $effect(() => {
        updateHandle = requestAnimationFrame(() => updateTime());
        return () => {
            cancelAnimationFrame(updateHandle);
        };
    });

    let interacted = $state(false);
    let loading = $state(false);

    let hoveredTime: number | undefined = $state();
    let duration = $derived(replayData.info.duration ?? 1);
    let elapsed = $state(0);

    $effect(() => {
        if (playback.playing) {
            elapsed = clamp((now - playback.start) / 1000, 0, duration) + playback.offset;
        } else {
            elapsed = playback.offset;
        }
    });

    let container: HTMLElement | undefined = $state();
    let player: HTMLElement | undefined = $state();
    let fullscreen = $state(false);
    let fullscreenButton: HTMLElement | undefined = $state();

    onMount(() => {
        if (!replayData) return;
        replayData.playback.playing = false;
    });

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
</script>

<svelte:window
    onkeydown={(event) => {
        lastActionTime = Date.now();
        playback.start = Date.now();
        playback.offset = elapsed;
        switch (event.key) {
            case ' ':
            case 'k':
                playback.playing = !playback.playing;
                break;
            case 'ArrowLeft':
                playback.offset = playback.offset -= 5;
                break;
            case 'ArrowRight':
                playback.offset = playback.offset += 5;
                break;
            case 'j':
                playback.offset = playback.offset -= 10;
                break;
            case 'l':
                playback.offset = playback.offset += 10;
                break;
            case 'f':
                if (fullscreen) {
                    document.exitFullscreen();
                } else {
                    container?.requestFullscreen();
                }
                break;
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
                playback.offset = parseInt(event.key) / 10 * duration;
                break;
            case 'm':
                $config.muted = !$config.muted;
                break;
            default:
                break;
        }
        playback.offset = clamp(playback.offset, 0, duration);
    }}
    onfullscreenchange={() => {
        fullscreen = !!document.fullscreenElement;
    }}
/>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="container" bind:this={container}
    onmousemove={() => {
        lastActionTime = Date.now();
    }}
    onmousedown={() => {
        lastActionTime = Date.now();
    }}
    onmouseleave={() => {
        lastActionTime -= 621 * 2 / 3;
    }}
>
    {#if replayData}
        <div class="player" class:interacted bind:this={player} onclick={(event) => {
            if (event.target !== player) return;
            playback.start = Date.now();
            playback.offset = elapsed;
            playback.playing = !playback.playing;
        }}>
            {#if replayData.video.type === 'youtube'}
                <YoutubePlayer
                    video={replayData.video}
                    bind:playback={replayData.playback}
                    bind:info={replayData.info}
                    bind:interacted
                    bind:loading
                />
            {:else if replayData.video.type === 'twitch'}
                <TwitchPlayer
                    video={replayData.video}
                    bind:playback={replayData.playback}
                />
            {/if}
            {#if !interacted}
                <div class="interaction" class:loading>
                    {#if loading}
                        <Spinner />
                    {:else}
                        <i class="ti ti-player-play"></i>
                    {/if}
                </div>
            {/if}
        </div>
    {/if}
    {#if interacted && now - lastActionTime < 621}
        <div class="control-container" transition:fly={{ duration: 62.1, y: 10 }}>
            <div class="control">
                <button onclick={() => {
                    playback.playing = !playback.playing;
                }} aria-label="play">
                    <Tooltip>
                        {#if playback.playing}
                            停止
                        {:else}
                            再生
                        {/if}
                    </Tooltip>
                    {#if playback.playing}
                        <i class="ti ti-player-pause"></i>
                    {:else}
                        <i class="ti ti-player-play"></i>
                    {/if}
                </button>
                <button onclick={() => {
                    $config.muted = !$config.muted;
                }} aria-label="mute">
                    <Tooltip>
                        {#if $config.muted}
                            ミュートを解除
                        {:else}
                            ミュート
                        {/if}
                    </Tooltip>
                    {#if $config.muted}
                        <i class="ti ti-volume-3"></i>
                    {:else}
                        <i class="ti ti-volume"></i>
                    {/if}
                </button>
                <div class="time">
                    {formatTime(elapsed, getTimeUnits(duration))}
                    <small>
                        <i class="ti ti-slash"></i>
                        {formatTime(duration, getTimeUnits(duration))}
                    </small>
                </div>
                <button
                    style:margin-left="auto"
                    bind:this={fullscreenButton}
                    onclick={() => {
                        if (fullscreen) {
                            document.exitFullscreen();
                        } else {
                            container?.requestFullscreen();
                        }
                        fullscreenButton?.blur();
                    }}
                    aria-label="play"
                >
                    <Tooltip>
                        {#if fullscreen}
                            フルスクリーンを解除
                        {:else}
                            フルスクリーン
                        {/if}
                    </Tooltip>
                    {#if fullscreen}
                        <i class="ti ti-minimize"></i>
                    {:else}
                        <i class="ti ti-maximize"></i>
                    {/if}
                </button>
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <div
                    class="progress"
                    onmousemove={(event) => {
                        const current = event.currentTarget;
                        const rect = current.getBoundingClientRect();
                        hoveredTime = (event.clientX - rect.left) / rect.width;
                    }}
                    onmouseleave={(event) => {
                        const current = event.currentTarget;
                        const rect = current.getBoundingClientRect();
                        hoveredTime = (event.clientX - rect.left) / rect.width;
                        hoveredTime = undefined;
                    }}
                    onmousedown={() => {
                        if (!hoveredTime) return;
                        playback.offset = duration * hoveredTime;
                        playback.start = Date.now();
                    }}
                    role="timer"
                >
                    <div class="background"></div>
                    <div class="value" style:width="{clamp(elapsed / duration, 0, 1) * 100}%"></div>
                    <div class="circle" style:left="{clamp(elapsed / duration, 0, 1) * 100}%"></div>
                    {#if hoveredTime}
                        {@const seconds = hoveredTime * duration}
                        <div class="tooltip" style:left="{hoveredTime * 100}%">
                            {formatTime(seconds, getTimeUnits(duration))}
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    {/if}
    {#if fullscreen}
        <TooltipPortal />
        <PopupPortal />
    {/if}
</div>

<style>
    .container {
        position: relative;
        width: 100%;
        height: 100%;
        background: var(--color-bg-2);
        border-radius: 2px;
        overflow: hidden;
        outline: 1px solid var(--color-outline);
    }

    .player {
        position: absolute;
        width: 100%;
        height: 100%;

        > .interaction {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            border-radius: 100%;
            padding: 1rem;
            outline: 3px solid var(--color-1);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            background: #fff;
            color: var(--color-1);
            pointer-events: none;

            &.loading {
                background: var(--color-1);
                color: var(--color-bg-1);
                opacity: 0.379;
            }
        }
    }

    .control-container {
        position: absolute;
        inset: 0;
        top: unset;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(
            color-mix(in srgb, var(--color-bg-2) 1%, transparent 0%),
            color-mix(in srgb, var(--color-bg-2) 20%, transparent 0%),
            color-mix(in srgb, var(--color-bg-2) 90%, transparent 0%),
            color-mix(in srgb, var(--color-bg-2) 96%, transparent 0%),
            color-mix(in srgb, var(--color-bg-2) 98%, transparent 0%)
        );

        > .control {
            display: flex;
            padding: 1rem;
            height: 8rem;
            align-items: flex-end;
            gap: 0.5rem;
            width: 100%;

            > button {
                border-radius: 3px;
                background: var(--color-1);
                color: var(--color-bg-1);
                padding: 0.5rem 1rem;
                margin: 1px;
                border: none;
                outline: 1px solid var(--color-1);
                padding: 0.5rem 1rem;
                filter: drop-shadow(0 3px 0 var(--color-outline));
            }
        }
    }

    .time {
        border-radius: 2px;
        color: var(--color-1);
        padding: 0.5rem 1rem;
        border: none;
    }

    .progress {
        position: absolute;
        color: #fff;
        left: 1rem;
        right: 1rem;
        accent-color: var(--color-2);
        border: none;
        height: 3rem;
        bottom: 3.5rem;
        cursor: pointer;

        > .background {
            position: absolute;
            top: 1.5rem;
            background: var(--color-bg-1);
            width: 100%;
            height: 0.25rem;
            border-radius: 10px;
            background: var(--color-bg-2);
            filter: drop-shadow(0 3px 0 var(--color-outline));
        }

        > .value {
            position: absolute;
            top: 1.5rem;
            background: var(--color-1);
            height: 0.25rem;
            border-radius: 10px;
        }

        > .circle {
            position: absolute;
            top: 1.5rem;
            transform: translate(-50%, -35%);
            background: var(--color-1);
            height: 0.25rem;
            border-radius: 10px;
            width: 0.75rem;
            height: 0.75rem;
        }

        > .tooltip {
            position: absolute;
            background: #000;
            padding: 0.25rem 0.5rem;
            font-size: 0.8rem;
            transform: translateX(-50%);
            bottom: 2rem;

            &::before {
                position: absolute;
                bottom: -1rem;
                left: 50%;
                content: '';
                position: fixed;
                pointer-events: none;
                content: "";
                user-select: none;
                border: 0.5rem solid transparent;
                border-top-color: #000;
                transform: translate(-50%, -15%);
            }
        }
    }
</style>
