<script lang="ts">
    import { FileDrop, Slider } from '@omujs/ui';
    import { uploadAssetByFile } from '../../asset/asset.js';
    import EditImage from '../../components/EditImage.svelte';
    import TransformEdit from '../../components/TransformEdit.svelte';
    import { createTransform } from '../../game/transform.js';
    import type { Liquid } from './liquid.js';
    
    export let behavior: Liquid;
</script>

<div class="behavior">
    Mask
    <EditImage image={behavior.mask?.asset} handle={(image) => {
        if (!image) return;
        behavior.mask ??= {
            asset: image,
            transform: createTransform(),
        };
        behavior.mask.asset = image;
    }} required />
    {#if behavior.mask}
        <TransformEdit bind:transform={behavior.mask.transform} />
    {/if}
    Liquid
    <TransformEdit bind:transform={behavior.transform}/>
    Layers
    <FileDrop primary handle={async (files) => {
        const [file] = files;
        const asset = await uploadAssetByFile(file);
        behavior.layers = [
            ...behavior.layers,
            {
                side: asset,
                amount: 0,
            }
        ]
    }}>
        層を追加
    </FileDrop>
    <div class="layers">
        {#each behavior.layers.toReversed() as layer, i (i)}
            <div class="layer">
                <div class="setting">
                    横側
                    <div class="image">
                        <EditImage image={layer.side} handle={(image) => {
                            if (!image) return;
                            layer.side = image;
                        }} required />
                    </div>
                </div>
                <div class="setting">
                    上側
                    <div class="image">
                        <EditImage image={layer.top} handle={(image) => {
                            layer.top = image;
                        }} />
                    </div>
                </div>
                <div class="setting">
                    量
                    <Slider bind:value={layer.amount} min={0} max={200} step={1} clamp={false} />
                </div>
            </div>
        {/each}
    </div>
</div>

<style lang="scss">
    .behavior {
        display: flex;
        align-items: stretch;
        flex-direction: column;
        gap: 1rem;
    }

    .layers {
        display: flex;
        align-items: stretch;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .layer {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        border-left: 2px solid var(--color-1);
        padding-left: 1rem;
    }

    .setting {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
    }

    .image {
        display: flex;
        align-items: flex-end;
        flex-direction: column;
        width: 11rem;
    }
</style>
