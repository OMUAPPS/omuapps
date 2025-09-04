<script lang="ts">
    import { page } from "$app/stores";
    import AssetPage from "$lib/components/AssetPage.svelte";
    import { App, Omu } from "@omujs/omu";
    import { ASSET_DOWNLOAD_PERMISSION_ID } from "@omujs/omu/api/asset";
    import { setClient } from "@omujs/ui";
    import { BROWSER } from "esm-env";
    import { APP_ID } from "../app.js";
    import AvatarRenderer from "../components/AvatarRenderer.svelte";
    import {
        DiscordOverlayApp,
        DISCORDRPC_PERMISSIONS,
    } from "../discord-overlay-app.js";

    let assetId = BROWSER && $page.url.searchParams.get("assetId");
    const id = assetId || Date.now().toString();
    const omu = new Omu(
        new App(APP_ID.join("asset", id), {
            version: "0.1.0",
        }),
    );
    const overlayApp = new DiscordOverlayApp(omu);
    setClient(omu);

    if (BROWSER) {
        omu.permissions.require(
            DISCORDRPC_PERMISSIONS.DISCORDRPC_VC_READ_PERMISSION_ID,
            ASSET_DOWNLOAD_PERMISSION_ID,
        );
        omu.start();
    }

    let promise = new Promise<void>((resolve) => {
        omu.onReady(async () => {
            resolve();
        });
    });
</script>

{#if id}
    <AssetPage>
        <main>
            {#await promise then}
                <AvatarRenderer {overlayApp} />
            {/await}
        </main>
    </AssetPage>
{:else}
    <p>id is not provided</p>
{/if}

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
