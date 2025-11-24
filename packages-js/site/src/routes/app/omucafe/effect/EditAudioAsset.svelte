<script lang="ts">
    import { getAsset, type Asset } from '../asset/asset.js';

    export let asset: Asset | undefined;

    $: src = asset && getAsset(asset);
</script>

{#await src then src}
    <audio controls {src}></audio>
{/await}

<style lang="scss">
    audio::-webkit-media-controls-enclosure {
        border-radius: 0;
        background-color: var(--color-bg-2);
    }

    audio {
        width: auto;
        accent-color: var(--color-1);
    }
</style>
