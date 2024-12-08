<script lang="ts">
    import { Align } from '@omujs/ui';
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
        <label>
            自動で整列
            <hr>
            <input type="checkbox" bind:checked={$config.align.auto} />
        </label>
    </span>
    <span>
        整列する面
        <hr>
        <Align bind:horizontal={$config.align.horizontal} bind:vertical={$config.align.vertical} />
    </span>
    <span>
        <label>
            面に応じて反転
            <hr>
            <input type="checkbox" bind:checked={$config.align.flip} />
        </label>
    </span>
    <span>
        <label>
            人数におおじて大きさを調節
            <hr>
            <input type="checkbox" bind:checked={$config.align.scaling} />
        </label>
    </span>
</section>

<h2>
    整列の余白
    <i class="ti ti-layout"></i>
</h2>
<section>
    <span>
        <label>
            左
            <hr>
            <input type="range" bind:value={$config.align.padding.left} min="0" step="1" max="300" /><p>{$config.align.padding.left}</p>
        </label>
    </span>
    <span>
        <label>
            上
            <hr>
            <input type="range" bind:value={$config.align.padding.top} min="0" step="1" max="300" /><p>{$config.align.padding.top}</p>
        </label>
    </span>
    <span>
        <label>
            右
            <hr>
            <input type="range" bind:value={$config.align.padding.right} min="0" step="1" max="300" /><p>{$config.align.padding.right}</p>
        </label>
    </span>
    <span>
        <label>
            下
            <hr>
            <input type="range" bind:value={$config.align.padding.bottom} min="0" step="1" max="300" /><p>{$config.align.padding.bottom}</p>
        </label>
    </span>
    <span>
        <label>
            間隔
            <hr>
            <input type="range" bind:value={$config.align.spacing} min="0" step="1" max="500" /><p>{$config.align.spacing}</p>
        </label>
    </span>
</section>

<h2>
    エフェクト
    <i class="ti ti-filters"></i>
</h2>
<section>
    <EffectControls {overlayApp} />
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

    label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 0.5rem;
    }

    hr {
        flex: 1;
        height: 1px;
        border: none;
        background: var(--color-outline);
        margin: 0.5rem 0.5rem;
    }

    span {
        display: flex;
        justify-content: space-between;
        width: 100%;
        gap: 0.5rem;
        font-size: 0.9rem;
        margin-bottom: 0.5rem;
    }

    section {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding-left: 0.5rem;
    }

    input {
        width: 1.25rem;
        height: 1.25rem;
        accent-color: var(--color-1);

        &:hover {
            accent-color: var(--color-1);
        }
    }

    input[type='range'] {
        width: 50%;
    }
</style>
