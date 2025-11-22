<script lang="ts">
    import { Button } from '@omujs/ui';
    import { DEV } from 'esm-env';
    import { DEFAULT_CONFIG, type DiscordOverlayApp } from '../discord-overlay-app.js';
    import EffectControls from './EffectControls.svelte';

    interface Props {
        overlayApp: DiscordOverlayApp;
    }

    let { overlayApp }: Props = $props();
    const { config } = overlayApp;
</script>

<h2>
    エフェクト
    <i class="ti ti-filters"></i>
</h2>
<section>
    <EffectControls bind:effects={$config.effects} />
</section>
{#if DEV}
    <Button onclick={() => {
        $config = DEFAULT_CONFIG;
        location.reload();
    }} primary>
        設定をリセット
    </Button>
{/if}

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
