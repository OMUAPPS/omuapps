<script lang="ts">
    import { run } from 'svelte/legacy';

    import { MarshmallowApp, type Asset } from '../marshmallow-app';

    const marshmallowApp = MarshmallowApp.getInstance();
    interface Props {
        asset: Asset | undefined;
        children?: import('svelte').Snippet<[any]>;
    }

    let { asset, children }: Props = $props();

    let src: string | undefined = $state(undefined);

    async function update(asset: Asset | undefined) {
        if (!asset) {
            src = undefined;
            return;
        }
        src = await marshmallowApp.getAssetUrl(asset);
    }

    run(() => {
        update(asset);
    }); ;
</script>

{#if src}
    {#if children}{@render children({ src })}{:else}
        <img src={src} alt="" />
    {/if}
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
