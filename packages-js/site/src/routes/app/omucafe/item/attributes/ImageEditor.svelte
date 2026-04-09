<script lang="ts">
    import EditAsset from '../../common/EditAsset.svelte';
    import type { AttrImage } from './image';

    interface Props {
        attr?: AttrImage;
    }

    let { attr = $bindable() }: Props = $props();
</script>

{#if attr}
    <EditAsset bind:asset={attr.asset} />
{/if}
