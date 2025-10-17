<script lang="ts">
    import type { Omu } from '@omujs/omu';
    import { ASSET_DOWNLOAD_PERMISSION_ID } from '@omujs/omu/api/asset';
    import { BROWSER } from 'esm-env';
    import AvatarRenderer from '../components/AvatarRenderer.svelte';
    import { DiscordOverlayApp, DISCORDRPC_PERMISSIONS } from '../discord-overlay-app';

    export let omu: Omu;
    const overlayApp = new DiscordOverlayApp(omu);

    if (BROWSER) {
        omu.permissions.require(
            DISCORDRPC_PERMISSIONS.DISCORDRPC_VC_READ_PERMISSION_ID,
            ASSET_DOWNLOAD_PERMISSION_ID,
        );
        omu.start();
    }

</script>

<main>
    {#await omu.waitForReady() then}
        <AvatarRenderer {overlayApp} />
    {/await}
</main>

<style>
    :global(body) {
        background: transparent !important;
        overflow: hidden;
    }

    main {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: end;
    }
</style>
