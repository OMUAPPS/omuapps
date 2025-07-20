<script lang="ts">
    import { Combobox } from '@omujs/ui';
    import EditImage from '../../components/EditImage.svelte';
    import TransformEdit from '../../components/TransformEdit.svelte';
    import { createTransform } from '../../game/transform.js';
    import { showMask, type Container } from './container.js';

    export let behavior: Container;
</script>

<div
    class="behavior"
    on:mouseenter={() => {
        $showMask = true;
    }}
    on:mouseleave={() => {
        $showMask = false;
    }}
    role="img"
>
    <label class="setting">
        内容物を範囲内に収める
        <input type="checkbox" value={!!behavior.bounded} on:change={({currentTarget}) => {
            if (!currentTarget.checked) {
                behavior.bounded = undefined;
                return;
            }
            behavior.bounded = { left: true, top: true, right: true, bottom: true}}
        } />
    </label>
    {#if behavior.bounded}
        <label class="setting">
            left
            <input type="checkbox" bind:checked={behavior.bounded.left} />
        </label>
        <label class="setting">
            top
            <input type="checkbox" bind:checked={behavior.bounded.top} />
        </label>
        <label class="setting">
            right
            <input type="checkbox" bind:checked={behavior.bounded.right} />
        </label>
        <label class="setting">
            bottom
            <input type="checkbox" bind:checked={behavior.bounded.bottom} />
        </label>
    {/if}
    <h2>Mask</h2>
    <EditImage image={behavior.mask?.asset} handle={(asset) => {
        if (!asset) {
            delete behavior.mask;
            return;
        }
        behavior.mask = {
            asset,
            transform: createTransform(),
        }
    }} />
    {#if behavior.mask}
        <TransformEdit bind:transform={behavior.mask.transform} />
    {/if}
    <h2>Overlay</h2>
    <EditImage image={behavior.overlay?.asset} handle={(asset) => {
        if (!asset) {
            delete behavior.overlay;
            return;
        }
        behavior.overlay = {
            asset,
            transform: createTransform(),
        }
    }} />
    {#if behavior.overlay}
        <TransformEdit bind:transform={behavior.overlay.transform} />
    {/if}
    <Combobox options={{
        none: {
            value: null,
            label: '未設定',
        },
        up: {
            value: 'up',
            label: '上に重ねる',
        },
        down: {
            value: 'down',
            label: '下に重ねる',
        },
    }} bind:value={behavior.order} />
</div>
