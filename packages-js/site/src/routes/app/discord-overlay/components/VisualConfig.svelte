<script lang="ts">
    import { Button, Slider } from '@omujs/ui';
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
</h2>
<section>
    <EffectControls bind:effects={$config.effects} />
</section>
<h2>
    整列
</h2>
<section>
    余白
    <Slider bind:value={$config.align.margin} min={0} max={600} step={1} />
    間隔
    <Slider bind:value={$config.align.spacing} min={1} max={600} step={1} />
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
        margin-bottom: 2rem;
    }

    h2 {
        color: var(--color-1);
        margin-bottom: 1rem;
    }
</style>
