<script lang="ts">
    import { OmuPermissions, type Omu } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import { ClockApp } from '../clock-app';
    import ClockRenderer from '../components/ClockRenderer.svelte';

    interface Props {
        omu: Omu;
    }

    let { omu }: Props = $props();
    const clockApp = new ClockApp(omu);

    if (BROWSER) {
        omu.permissions.require(
            OmuPermissions.ASSET_PERMISSION_ID,
        );
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
