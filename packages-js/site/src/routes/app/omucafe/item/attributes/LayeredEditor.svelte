<script lang="ts">
    import { Button, Combobox, FileDrop, Slider } from '@omujs/ui';
    import Collapse from '../../common/Collapse.svelte';
    import EditAsset from '../../common/EditAsset.svelte';
    import { Game } from '../../core/game';
    import type { AttrLayered, Layer } from './layered';

    interface Props {
        attr?: AttrLayered;
    }

    let { attr = $bindable() }: Props = $props();
</script>

{#if attr}
    <Collapse name="容器">
        <small>容量</small>
        <Slider bind:value={attr.capacity} min={0} max={800} step={1} />
        <small>始まる高さ</small>
        <Slider bind:value={attr.positionY} min={0} max={800} step={1} unit="px" />
        <small>横の位置</small>
        <Slider bind:value={attr.positionX} min={-400} max={400} step={1} unit="px" />
        <small>高さ</small>
        <Slider bind:value={attr.height} min={0} max={800} step={1} unit="px" />
        <small>幅</small>
        <Slider bind:value={attr.width} min={0} max={800} step={1} unit="px" />
        <small>上の曲率</small>
        <Slider bind:value={attr.curvature.top} min={0} max={400} step={1} />
        <small>下の曲率</small>
        <Slider bind:value={attr.curvature.bottom} min={0} max={400} step={1} />
    </Collapse>
    <h2>内容物</h2>
    {#each attr.layers as layer, index (index)}
        <Collapse name={layer.name}>
            <Button onclick={() => {
                attr.layers = attr.layers.filter((_, i) => i !== index);
            }} primary>
                削除
            </Button>
            <label>
                <small>種類</small>
                <Combobox options={{
                    solid: {
                        label: '個体',
                        value: 'solid',
                    },
                    liquid: {
                        label: '液体',
                        value: 'liquid',
                    },
                }} bind:value={() => layer.type, (newType) => {
                    layer.type = newType;
                    if (layer.type === 'liquid') {
                        layer.blending = 0;
                    }
                }} />
            </label>
            {#if attr.layers[index].type === 'liquid'}
                <label>
                    <small>混ざりやすさ</small>
                    <Slider bind:value={attr.layers[index].blending} min={0} max={400} step={1} unit="px" />
                </label>
            {/if}
            <label>
                <small>量</small>
                <Slider bind:value={attr.layers[index].volume} min={0} max={800} step={1} />
            </label>
            <label>
                断面
                <EditAsset bind:asset={attr.layers[index].side.asset} />
            </label>
            <label>
                上面
                <EditAsset bind:asset={attr.layers[index].top.asset} />
            </label>
        </Collapse>
    {/each}
    <FileDrop handle={async (files) => {
        const fileArray = Array.from(files);
        const side = fileArray.find(({ name }) => /(?:_?(?:横|side)).\w+/gm.exec(name)) ?? files[0];
        const top = fileArray.find(({ name }) => /(?:_?(?:上|top)).\w+/gm.exec(name)) ?? files[1] ?? side;
        const { asset } = Game.getInstance();
        const sideAsset = await asset.uploadFile(side);
        const topAsset = await asset.uploadFile(top);
        const regex = /(.+)(?:_?(?:上|top|横|side)).\w+/gm;
        let name = regex.exec(side.name)?.[1].slice(0, -1) ?? side.name;
        const layer: Layer = {
            type: 'solid',
            name,
            top: {
                asset: topAsset,
            },
            side: {
                asset: sideAsset,
            },
            volume: 100,
        };
        attr.layers = [...attr.layers, layer];
    }} multiple primary>
        追加
    </FileDrop>
{/if}

<style>
    label {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
</style>
