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
    <h3>余白</h3>
    <label>
        横
        <Slider bind:value={$config.align.margin.x} min={0} max={600} step={1} />
    </label>
    <label>
        縦
        <Slider bind:value={$config.align.margin.y} min={0} max={600} step={1} />
    </label>
    <label>
        間隔
        <Slider bind:value={$config.align.spacing} min={1} max={1600} step={1} clamp={false} />
    </label>
    <label>
        アバターの大きさの倍率
        <Slider bind:value={$config.align.base_scale} min={0.1} max={2} step={0.1} />
    </label>
    <label>
        角の丸み
        <Slider bind:value={$config.align.border_radius} min={0} max={1} step={0.01} type="percent" />
    </label>
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
        margin-bottom: 2rem;
        background: var(--color-bg-1);
        padding: 1rem;
    }

    h2 {
        color: var(--color-1);
        font-size: 1.25rem;
        margin-bottom: 1rem;
    }

    label {
        display: flex;
        justify-content: space-between;
        padding: 0.75rem 0.5rem;
    }
</style>
