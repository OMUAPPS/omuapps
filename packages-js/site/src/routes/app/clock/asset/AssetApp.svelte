<script lang="ts">
    import type { Omu } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import { ClockApp } from '../clock-app';
    import ClockRenderer from '../components/ClockRenderer.svelte';

    export let omu: Omu;
    const clockApp = new ClockApp(omu);

    if (BROWSER) {
        omu.start();
    }

</script>

<main>
    {#await omu.waitForReady() then}
        {#await clockApp.fetchCalendar() then}
            <ClockRenderer {clockApp} />
        {/await}
    {/await}
</main>

<style>
    :global(body) {
        background: transparent !important;
        overflow: hidden;
    }

    main {
        position: absolute;
        inset: 0;
        color: var(--color-1);
        container-type: inline-size;
        display: flex;
        flex-direction: column;
        padding: 2rem;
        gap: 1rem;
    }
</style>
