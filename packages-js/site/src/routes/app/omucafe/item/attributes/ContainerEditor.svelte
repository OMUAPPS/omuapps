<script lang="ts">
    import { Checkbox, FileDrop } from '@omujs/ui';
    import EditTransform from '../../common/EditTransform.svelte';
    import { Game } from '../../core/game';
    import { DEFAULT_TRANSFORM } from '../../core/transform';
    import type { AttrContainer } from './container';

    interface Props {
        attr?: AttrContainer;
    }

    let { attr = $bindable() }: Props = $props();
</script>

{#if attr}
    <label>
        有効
        <Checkbox bind:value={attr.active} />
    </label>
    <FileDrop accept="image/*" handle={async (files) => {
        const file = files[0];
        const asset = await Game.getInstance().assetManager.uploadFile(file);
        if (!attr.cover) {
            attr.cover = {
                asset,
                transform: DEFAULT_TRANSFORM,
            };
        } else {
            attr.cover.asset = asset;
        }
    }}>
        画像を変更
    </FileDrop>
    {#if attr.cover}
        <EditTransform bind:transform={attr.cover.transform} />
    {/if}
{/if}
