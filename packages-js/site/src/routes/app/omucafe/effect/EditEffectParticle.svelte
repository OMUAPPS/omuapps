<script lang="ts">
    import { FileDrop, Slider, Tooltip } from '@omujs/ui';
    import { uploadAssetByBlob } from '../asset/asset.js';
    import Aabb2Edit from '../components/AABB2Edit.svelte';
    import AssetImage from '../components/AssetImage.svelte';
    import type { EffectParticle } from './effect-state.js';

    export let particle: EffectParticle;
</script>

<h2>動き</h2>
<div class="property">
    個数
    <Slider min={0} max={16} step={1} clamp={false} bind:value={particle.emitter.count}/>
</div>
<div class="property">
    時間
    <Slider min={0} max={4000} step={1} clamp={false} unit="ms" bind:value={particle.emitter.duration}/>
</div>
<div class="property">
    速度
    <Aabb2Edit bind:bounds={particle.emitter.velocity} />
</div>
<div class="property">
    加速度
    <Aabb2Edit bind:bounds={particle.emitter.acceleration} />
</div>
<div class="property">
    大きさ
    <Aabb2Edit bind:bounds={particle.emitter.scale} />
</div>
<h2>不透明度</h2>
<div class="property">
    最低
    <Slider min={0} max={1} step={0.01} type="percent" clamp={false} bind:value={particle.emitter.opacity.x}/>
</div>
<div class="property">
    最高
    <Slider min={0} max={1} step={0.01} type="percent" clamp={false} bind:value={particle.emitter.opacity.y}/>
</div>
<h2>
    <span>
        画像 <small>- {particle.source.assets.length}個</small>
    </span>
    <FileDrop handle={async (files) => {
        const assets = await Promise.all([...files].map((file) => uploadAssetByBlob(file)));
        // const assets = [];
        // for (const file of files) {
        //     assets.push(await uploadAssetByBlob(file));
        // } 
        particle.source = {
            type: 'random',
            assets: assets,
        }
    }} primary multiple accept="image/*">
        画像を設定
        <i class="ti ti-upload"></i>
    </FileDrop>
</h2>
<div class="property">
    <div class="sources">
        {#each particle.source.assets as asset, i (i)}
            <button class="image" on:click={() => {
                particle.source.assets = particle.source.assets.filter((_, index) => index !== i);
            }}>
                <Tooltip>
                    クリックで削除
                </Tooltip>
                <AssetImage asset={asset} />
            </button>
        {/each}
    </div>
</div>

<style lang="scss">
    h2 {
        margin-bottom: 0.5rem;
        padding-top: 1rem;
    }

    .property {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--color-bg-2);
        padding: 1rem;
        margin-top: 0.5rem;
    }
    
    .sources {
        width: 100%;
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.75rem;
    }

    h2 {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
    }

    .image {
        width: 5.5rem;
        height: 5.5rem;
        border: 1px solid var(--color-outline);
        background: var(--color-bg-1);
    }

    button {
        cursor: pointer;
    }
</style>
