<script lang="ts">
    import { Identifier } from '@omujs/omu';
    import { onDestroy } from 'svelte';
    import type { Asset } from '../game/asset.js';
    import { getGame } from '../omucafe-app.js';

    export let asset: Asset | undefined;

    const { omu } = getGame();

    let src: string | null = null;

    async function update(asset: Asset | undefined) {
        if (src) {
            URL.revokeObjectURL(src);
        }
        if (!asset) {
            src = null;
            return;
        }
        if (asset.type === 'url') {
            src = asset.url;
        } else if (asset.type === 'asset') {
            const { buffer } = await omu.assets.download(Identifier.fromKey(asset.id));
            src = URL.createObjectURL(new Blob([buffer]));
        }
    }

    onDestroy(() => {
        if (src) {
            URL.revokeObjectURL(src);
        }
    });

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
