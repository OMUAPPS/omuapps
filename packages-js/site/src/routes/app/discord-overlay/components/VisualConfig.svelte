<script lang="ts">
    import { Checkbox, Slider } from '@omujs/ui';
    import type { DiscordOverlayApp } from '../discord-overlay-app.js';
    import EffectControls from './EffectControls.svelte';

    export let overlayApp: DiscordOverlayApp;
    const { config } = overlayApp;
</script>

<h2>
    整列
    <i class="ti ti-layout"></i>
</h2>
<section class="align">
    <span>
        <Checkbox bind:value={$config.align.flip} label="面に応じて反転" />
    </span>
    <span>
        <Checkbox bind:value={$config.align.scaling} label="人数に応じて大きさを調節" />
    </span>
</section>

<h2>
    表示
    <i class="ti ti-eye"></i>
</h2>
<section>
    <span>
        <Checkbox bind:value={$config.show_name_tags} label="名前を表示" />
    </span>
</section>

<h2>
    整列の余白
    <i class="ti ti-layout"></i>
</h2>
<section>
    <span>
        左
        <Slider bind:value={$config.align.padding.left} min={0} max={500} step={1} />
    </span>
    <span>
        上
        <Slider bind:value={$config.align.padding.top} min={0} max={500} step={1} />
    </span>
    <span>
        右
        <Slider bind:value={$config.align.padding.right} min={0} max={500} step={1} />
    </span>
    <span>
        下
        <Slider bind:value={$config.align.padding.bottom} min={0} max={500} step={1} />
    </span>
    <span>
        間隔
        <Slider bind:value={$config.align.spacing} min={0} max={500} step={1} />
    </span>
</section>

<h2>
    エフェクト
    <i class="ti ti-filters"></i>
</h2>
<section>
    <EffectControls bind:effects={$config.effects} />
</section>

<style lang="scss">
    .align {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: start;
    }

    h2 {
        margin-bottom: 0.5rem;
        border-bottom: 1px solid var(--color-outline);
        padding-bottom: 0.5rem;
    }

    span {
        display: flex;
        justify-content: space-between;
        width: 100%;
        gap: 0.5rem;
        font-size: 0.8621rem;
        margin-bottom: 0.75rem;
    }

    section {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding-left: 0.5rem;
        margin-top: 0.5rem;
        margin-bottom: 1rem;
    }
</style>
