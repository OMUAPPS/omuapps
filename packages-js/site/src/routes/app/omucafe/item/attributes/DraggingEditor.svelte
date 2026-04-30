<script lang="ts">
    import { Checkbox, Tooltip } from '@omujs/ui';
    import EditAudioClip from '../../common/EditAudioClip.svelte';
    import type { AttrDragging } from './dragging';

    interface Props {
        attr?: AttrDragging;
    }

    let { attr = $bindable() }: Props = $props();
</script>

{#if attr}
    <label>
        <Tooltip>
            無効にすると編集時のみに移動できるようになります
        </Tooltip>
        有効
        <Checkbox bind:value={attr.active} />
    </label>
    <label>
        掴んだときの音
        <EditAudioClip bind:clip={attr.dragSound} />
    </label>
    <label>
        置いたときの音
        <EditAudioClip bind:clip={attr.dropSound} />
    </label>
{/if}

<style lang="scss">
</style>
