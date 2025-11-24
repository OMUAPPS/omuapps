<script lang="ts">
    import { MarshmallowApp, type Asset } from '../marshmallow-app';

    const marshmallowApp = MarshmallowApp.getInstance();
    export let asset: Asset | undefined;

    let src: string | undefined = undefined;

    async function update(asset: Asset | undefined) {
        if (!asset) {
            src = undefined;
            return;
        }
        src = await marshmallowApp.getAssetUrl(asset);
    }

    $: {
        update(asset);
    };
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
