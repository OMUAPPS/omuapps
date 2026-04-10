<script lang="ts">
    import { Button, Checkbox, Combobox, Slider, Textbox } from '@omujs/ui';
    import Collapse from '../../common/Collapse.svelte';
    import EditAsset from '../../common/EditAsset.svelte';
    import EditTransform from '../../common/EditTransform.svelte';
    import { createTransform } from '../../core/transform';
    import type { AttrContainer } from './container';

    interface Props {
        attr?: AttrContainer;
    }

    let { attr = $bindable() }: Props = $props();
    if (attr?.constraints?.bounds) {
        attr.constraints.bounds.padding ??= {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
        };
    }
</script>

{#if attr}
    <label>
        有効
        <Checkbox bind:value={attr.active} />
    </label>
    <Collapse name="カバー画像">
        <EditAsset bind:asset={() => attr.cover?.asset, (asset) => {
            if (!asset) return;
            attr.cover = {
                asset,
                transform: createTransform(),
            };
        }} remove={() => {
            attr.cover = undefined;
        }} />
        {#if attr.cover}
            <EditTransform bind:transform={attr.cover.transform} />
        {/if}
    </Collapse>
    <Collapse name="マスキング">
        <EditAsset bind:asset={() => attr.mask?.asset, (asset) => {
            if (!asset) return;
            attr.mask = {
                asset,
                transform: createTransform(),
            };
        }} remove={() => {
            attr.mask = undefined;
        }} />
        {#if attr.mask}
            <EditTransform bind:transform={attr.mask.transform} />
        {/if}
    </Collapse>
    <Collapse name="制限">
        <label>
            制限をつける
            <Checkbox bind:value={() => !!attr.constraints, (value) => {
                if (value) {
                    attr.constraints = {};
                } else {
                    attr.constraints = undefined;
                }
            }} />
        </label>
        {#if attr.constraints}
            <label>
                最大アイテム数
                <Checkbox bind:value={() => attr.constraints?.maxItems !== undefined, (value) => {
                    if (!attr.constraints) return;
                    if (value) {
                        attr.constraints.maxItems = 1;
                    } else {
                        attr.constraints.maxItems = undefined;
                    }
                }} />
            </label>
            {#if attr.constraints.maxItems !== undefined}
                <Slider bind:value={attr.constraints.maxItems} min={0} max={32} step={1} />
            {/if}
            <label>
                アイテムタグ
                <Checkbox bind:value={() => attr.constraints?.tags !== undefined, (value) => {
                    if (!attr.constraints) return;
                    if (value) {
                        attr.constraints.tags = [];
                    } else {
                        attr.constraints.tags = undefined;
                    }
                }} />
            </label>
            {#if attr.constraints.tags !== undefined}
                {#each attr.constraints.tags as _, index (index)}
                    <label>
                        <Textbox bind:value={attr.constraints.tags[index]} />
                        <Button onclick={() => {
                            if (!attr.constraints) return;
                            attr.constraints.tags = attr.constraints.tags?.filter((_, i) => i !== index);
                        }} primary>
                            <i class="ti ti-x"></i>
                        </Button>
                    </label>
                {/each}
                <Button onclick={() => {
                    attr.constraints?.tags?.push('');
                }} primary>
                    タグを追加
                </Button>
            {/if}
            <label>
                はみ出し防止
                <Checkbox bind:value={() => attr.constraints?.bounds !== undefined, (value) => {
                    if (!attr.constraints) return;
                    if (value) {
                        attr.constraints.bounds = {
                            horizontal: 'both',
                            vertical: 'bottom',
                            padding: {
                                left: 0,
                                right: 0,
                                top: 0,
                                bottom: 0,
                            },
                        };
                    } else {
                        attr.constraints.bounds = undefined;
                    }
                }} />
            </label>
            {#if attr.constraints.bounds}
                <label>
                    水平方向
                    <Combobox bind:value={attr.constraints.bounds.horizontal} options={{
                        left: {
                            label: '左にはみ出さない',
                            value: 'left',
                        },
                        right: {
                            label: '右にはみ出さない',
                            value: 'right',
                        },
                        both: {
                            label: '左右にはみ出さない',
                            value: 'both',
                        },
                        none: {
                            label: 'はみ出してもいい',
                            value: 'none',
                        },
                    }} />
                </label>
                <label>
                    垂直方向
                    <Combobox bind:value={attr.constraints.bounds.vertical} options={{
                        top: {
                            label: '上にはみ出さない',
                            value: 'top',
                        },
                        bottom: {
                            label: '下にはみ出さない',
                            value: 'bottom',
                        },
                        both: {
                            label: '上下にはみ出さない',
                            value: 'both',
                        },
                        none: {
                            label: 'はみ出してもいい',
                            value: 'none',
                        },
                    }} />
                </label>
                <label>
                    余白
                    <div style="display: flex; gap: 0.5rem; align-items: center; flex-direction: column;">
                        <span>左</span>
                        <Slider bind:value={attr.constraints.bounds.padding.left} min={0} max={512} step={1} clamp={false} />
                        <span>右</span>
                        <Slider bind:value={attr.constraints.bounds.padding.right} min={0} max={512} step={1} clamp={false} />
                        <span>上</span>
                        <Slider bind:value={attr.constraints.bounds.padding.top} min={0} max={512} step={1} clamp={false} />
                        <span>下</span>
                        <Slider bind:value={attr.constraints.bounds.padding.bottom} min={0} max={512} step={1} clamp={false} />
                    </div>
                </label>
            {/if}
        {/if}
    </Collapse>
    <small>前後関係</small>
    <Combobox bind:value={attr.layerOrder} options={{
        lower: {
            label: '下にあるほど前へ',
            value: 'lower',
        },
        upper: {
            label: '上にあるほど前へ',
            value: 'upper',
        },
    }} />
{/if}

<style lang="scss">
    label {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
    }
</style>
