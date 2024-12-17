<script lang="ts">
    import AssetButton from '$lib/components/AssetButton.svelte';
    import { OBSPlugin } from '@omujs/obs';
    import { Omu } from '@omujs/omu';
    import type { ClockApp } from './clock-app.js';
    import ClockRenderer from './components/ClockRenderer.svelte';

    export let omu: Omu;
    export let obs: OBSPlugin;
    export let clockApp: ClockApp;
</script>

<main>
    {#await clockApp.fetchCalendar() then}
        <ClockRenderer {clockApp} />
    {/await}
    <p>
        <AssetButton {omu} {obs} dimensions={{width: 500, height: 400}}/>
    </p>
</main>

<style lang="scss">
    :global(body) {
        overflow: hidden;
    }

    main {
        position: absolute;
        inset: 0;
        color: var(--color-1);
        container-type: inline-size;
        display: flex;
        flex-direction: column;
        margin: 1rem;
        gap: 1rem;
    }
</style>
