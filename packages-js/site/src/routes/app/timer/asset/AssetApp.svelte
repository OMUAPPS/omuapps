<script lang="ts">
    import { Omu } from '@omujs/omu';
    import Timer from '../components/Timer.svelte';
    import { TimerApp } from '../timer-app.js';

    export let omu: Omu;
    export let timer: TimerApp;
    const { config } = timer;

    $: alignHorizontal = {
        start: 'start',
        middle: 'center',
        end: 'end',
    }[$config.style.align.x];
    $: alignVertical = {
        start: 'start',
        middle: 'center',
        end: 'end',
    }[$config.style.align.y];
</script>

<main style:justify-content={alignHorizontal} style:align-items={alignVertical}>
    <Timer {timer} />
</main>

<style>
    main {
        display: flex;
        height: 100vh;
    }
</style>
