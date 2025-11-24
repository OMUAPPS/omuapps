<script lang="ts">
    import { OBSPlugin } from '@omujs/obs';
    import { Omu } from '@omujs/omu';
    import { AssetButton } from '@omujs/ui';
    import { ASSET_APP } from './app.js';
    import type { ClockApp } from './clock-app.js';
    import ClockRenderer from './components/ClockRenderer.svelte';

    interface Props {
        omu: Omu;
        obs: OBSPlugin;
        clockApp: ClockApp;
    }

    let { omu, obs, clockApp }: Props = $props();
</script>

<main>
    {#await clockApp.fetchCalendar() then}
        <ClockRenderer {clockApp} />
    {/await}
    <p>
        <AssetButton asset={ASSET_APP} dimensions={{ width: 500, height: 400 }} />
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
