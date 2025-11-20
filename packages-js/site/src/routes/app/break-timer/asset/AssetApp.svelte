<script lang="ts">
    import { OBSPlugin } from '@omujs/obs';
    import type { Omu } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import { BreakTimerApp } from '../break-timer-app';
    import TimeRenderer from '../components/TimeRenderer.svelte';

    interface Props {
        omu: Omu;
    }

    let { omu }: Props = $props();
    const obs = OBSPlugin.create(omu);
    const breakTimer = new BreakTimerApp(omu, obs);
    const { config, timerState: state } = breakTimer;

    if (BROWSER) {
        omu.start();
    }
</script>

<main>
    {#if $state.type === 'break' && $config.timer}
        <TimeRenderer end={$state.start + $config.timer.duration * 1000}>
            <h1>{$config.timer.message}</h1>
        </TimeRenderer>
    {/if}
</main>

<style>
    :global(body) {
        background: transparent !important;
    }

    main {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: start;
        padding-top: 4rem;
        overflow: hidden;
    }

    h1 {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 2rem;
        background: #000;
        color: var(--color-1);
        text-align: center;
    }
</style>
