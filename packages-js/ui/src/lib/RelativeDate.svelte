<script lang="ts">
    import { run } from 'svelte/legacy';

    import { onDestroy } from 'svelte';
    import { translate } from './stores.js';

    interface Props {
        date: Date | undefined;
    }

    let { date }: Props = $props();

    let formattedDate: string = $state('');
    let timer: number;
    let destroyed = false;

    const timeUnits = [
        { label: 'date.years_ago', value: 1000 * 60 * 60 * 24 * 365.25 },
        { label: 'date.months_ago', value: 1000 * 60 * 60 * 24 * 30.5 },
        { label: 'date.weeks_ago', value: 1000 * 60 * 60 * 24 * 7 },
        { label: 'date.days_ago', value: 1000 * 60 * 60 * 24 },
        { label: 'date.hours_ago', value: 1000 * 60 * 60 },
        { label: 'date.minutes_ago', value: 1000 * 60 },
        { label: 'date.seconds_ago', value: 1000 },
        { label: 'date.just_now', value: 0 },
        { label: 'date.seconds_later', value: -1000 },
        { label: 'date.minutes_later', value: -1000 * 60 },
        { label: 'date.hours_later', value: -1000 * 60 * 60 },
        { label: 'date.days_later', value: -1000 * 60 * 60 * 24 },
        { label: 'date.weeks_later', value: -1000 * 60 * 60 * 24 * 7 },
        { label: 'date.months_later', value: -1000 * 60 * 60 * 24 * 30.5 },
        { label: 'date.years_later', value: -1000 * 60 * 60 * 24 * 365.25 },
    ];

    function sleep(ms: number) {
        if (destroyed) return;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
            timer = 0;
            formatDate(date);
        }, ms);
    }

    function formatDate(date: Date | undefined) {
        if (!date) {
            formattedDate = '';
            return;
        }
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        for (let i = 0; i < timeUnits.length; i++) {
            let unit = timeUnits[i];
            if (diff < unit.value) {
                continue;
            }
            if (diff / unit.value < 1) {
                unit = timeUnits[i - 1];
            }
            const diffValue = Math.round(diff / unit.value);
            formattedDate = $translate(unit.label, { time: diffValue.toString() });
            sleep(unit.value - (diff % unit.value));
            return;
        }

        if (!formattedDate) {
            formattedDate = $translate('date.just_now');
            sleep(1000 - (diff % 1000));
        }
    }

    run(() => {
        formatDate(date);
    });

    onDestroy(() => {
        window.clearTimeout(timer);
        destroyed = true;
    });
</script>

{#if formattedDate}
    {formattedDate}
{/if}
