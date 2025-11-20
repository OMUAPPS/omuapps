<script lang="ts">
    import { onMount } from 'svelte';
    import type { ClockApp } from '../clock-app.js';
    import FitWidthText from './FitWidthText.svelte';

    interface Props {
        clockApp: ClockApp;
    }

    let { clockApp }: Props = $props();
    const EVENT_SWITCH_DELAY = 30;
    let time = $state(new Date());
    let handle: number;

    function updateTime() {
        time = new Date();
        const delay = 1000 - time.getMilliseconds();
        handle = window.setTimeout(updateTime, delay);
    }

    onMount(() => {
        updateTime();
        return () => {
            window.clearTimeout(handle);
        };
    });

    let year = $derived(time.getFullYear());
    let month = $derived(time.getMonth() + 1);
    let date = $derived(time.getDate());
    let hours = $derived(time.getHours());
    let minutes = $derived(time.getMinutes());
    let seconds = $derived(time.getSeconds());
    let totalSeconds = $derived(hours * 3600 + minutes * 60 + seconds);
    let today = $derived(clockApp.getTodayEvents(new Date(year, month - 1, date)));
    let eventIndex = $derived(today && totalSeconds / EVENT_SWITCH_DELAY % today.events.length | 0);
    let eventCount = $derived(today?.events.length || 0);
    let event = $derived(today?.events[eventIndex || 0]);
</script>

<main>
    <div class="container">
        <p class="time">
            <span class="hours">{hours.toString().padStart(2, '0')}</span>
            <span class="minutes">{minutes.toString().padStart(2, '0')}</span>
            <span class="seconds">{seconds.toString().padStart(2, '0')}</span>
        </p>
        <div class="event">
            <span class="date-time">
                <span class="month">{month}</span><small>月</small>
                <span class="date">{date}</span><small>日</small>
            </span>
            <span class="name">
                <FitWidthText>
                    {event?.title}
                </FitWidthText>
            </span>
            <small class="event-count">
                <span class="index">{(eventIndex || 0) + 1}</span>
                <i class="ti ti-slash slash"></i>
                <span class="count">{eventCount}</span>
            </small>
        </div>
        <p class="event-description">
            {event?.description.join('\n')}
        </p>
    </div>
</main>

<svelte:element this={"style"}>
    {`
    .time {
        font-size: 5rem !important;
    }

    .seconds {
        font-size: 2rem;
        color: var(--color-text);
    }

    .minutes:after {
            content: '' !important;
        }
    }
    `}
</svelte:element>

<style lang="scss">
    .container {
        display: flex;
        flex-direction: column;
        background: var(--color-bg-1);
        outline: 2px dashed var(--color-1);
        outline-offset: -0.5rem;
        padding: 1rem 2rem;
        padding-bottom: 2rem;
        border-radius: 0 0 2rem 2rem;
        max-width: 500px;
        max-height: 400px;
    }

    .time {
        font-size: 3rem;
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        border-bottom: 2px solid var(--color-1);
        margin-bottom: 1rem;

        > span {
            display: inline-block;
            text-align: center;
        }

        > .hours {
            &:after {
                content: ':';
            }
        }

        > .minutes {
            &:after {
                content: ':';
            }
        }
    }

    small {
        display: block;
        font-size: 0.75rem;
        color: var(--color-text);
        white-space: pre-wrap;
    }

    .date-time {
        display: inline-flex;
        align-items: baseline;
        margin-right: 1rem;
        font-size: 1.5rem;

        > .month {
            color: var(--color-1);
            font-weight: bold;
        }

        > .date {
            color: var(--color-text);
        }
    }

    .event {
        width: 100%;
        display: flex;

        > .name {
            font-weight: bold;
            font-size: 1.5rem;
            white-space: nowrap;
            width: 100%;
            text-align: end;
            margin-right: 1rem;
        }
    }

    .event-description {
        margin-top: 0.5rem;
        font-size: 1rem;
        color: var(--color-text);
        white-space: pre-wrap;
        display: -webkit-box;
        max-width: 100%;
        line-clamp: 2;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .event-count {
        display: inline-flex;
        align-items: baseline;
        margin-right: 1rem;

        > .index {
            color: var(--color-1);
            font-weight: bold;
            font-size: 1.5rem;
        }

        > .count {
            color: var(--color-text);
            font-size: 1rem;
        }
    }
</style>
