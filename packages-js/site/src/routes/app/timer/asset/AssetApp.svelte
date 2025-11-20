<script lang="ts">
    import { Omu } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import Timer from '../components/Timer.svelte';
    import { TimerApp } from '../timer-app.js';

    interface Props {
        omu: Omu;
    }

    let { omu }: Props = $props();

    const timer = new TimerApp(omu);
    const { config } = timer;
    if (BROWSER) {
        omu.start();
    }

    let alignHorizontal = $derived({
        start: 'start',
        middle: 'center',
        end: 'end',
    }[$config.style.align.x]);
    let alignVertical = $derived({
        start: 'start',
        middle: 'center',
        end: 'end',
    }[$config.style.align.y]);
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
