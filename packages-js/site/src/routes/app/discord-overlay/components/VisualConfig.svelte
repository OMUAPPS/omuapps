<script lang="ts">
    import type { DiscordOverlayApp } from '../discord-overlay-app.js';
    import EffectControls from './EffectControls.svelte';

    export let overlayApp: DiscordOverlayApp;
    const { config } = overlayApp;
</script>

<h2>
    エフェクト
    <i class="ti ti-filters"></i>
</h2>
<section>
    <EffectControls bind:effects={$config.effects} />
</section>

<style lang="scss">

    section {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding-left: 0.5rem;
        margin-top: 0.5rem;
        margin-bottom: 1rem;
    }
</style>
