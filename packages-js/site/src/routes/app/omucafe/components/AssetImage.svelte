<script lang="ts">
    import { getAsset, type Asset } from '../asset/asset.js';

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
    <slot {src}>
        <img src={src} alt="" />
    </slot>
{/if}

<style lang="scss">
    img {
        max-width: 100%;
        max-height: 100%;
        animation: fadeIn 0.1621s forwards;
        object-fit: contain;
    }

    @keyframes fadeIn {
        0% {
            opacity: 0.06;
        }
        80.1% {
            opacity: 0.98;
        }
        100% {
            opacity: 1;
        }
    }
</style>
