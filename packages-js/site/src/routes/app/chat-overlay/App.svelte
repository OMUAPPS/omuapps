<script lang="ts">
    import { OBSPlugin } from '@omujs/obs';
    import { Omu } from '@omujs/omu';
    import { AssetButton } from '@omujs/ui';
    import { ASSET_APP } from './app.js';
    import type { ChatOverlayApp } from './chat-app.js';

    interface Props {
        omu: Omu;
        obs: OBSPlugin;
        chatOverlayApp: ChatOverlayApp;
    }

    let { omu, obs, chatOverlayApp }: Props = $props();
</script>

<main>
    aa
    <p>
        <AssetButton asset={ASSET_APP} dimensions={{ width: 500, height: 400 }} />
    </p>
</main>

<style lang="scss">
    :global(body) {
        overflow: hidden;
    }

    main {
        position: absolute;
        inset: 0;
        color: var(--color-1);
        container-type: inline-size;
        display: flex;
        flex-direction: column;
        margin: 1rem;
        gap: 1rem;
    }
</style>
