<script lang="ts">
    import { getAsset, type Asset } from '../game/asset.js';

    export let asset: Asset | undefined;

    let src: string | null = null;

    async function update(asset: Asset | undefined) {
        if (asset) {
            src = (await getAsset(asset)).toString()
        }
    }

    $: update(asset);
</script>

{#if src}
    <img src={src} alt="" />
{/if}

<style lang="scss">
    img {
        max-width: 100%;
        max-height: 100%;
    }
</style>
