<script lang="ts">
    import { Omu } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import Timer from '../components/Timer.svelte';
    import { TimerApp } from '../timer-app.js';

    export let omu: Omu;

    const timer = new TimerApp(omu);
    const { config } = timer;
    if (BROWSER) {
        omu.start();
    }

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

{#await omu.waitForReady() then}
    <main style:justify-content={alignHorizontal} style:align-items={alignVertical}>
        <Timer {timer} />
    </main>
{/await}

<style>
    main {
        display: flex;
        height: 100vh;
    }
</style>
