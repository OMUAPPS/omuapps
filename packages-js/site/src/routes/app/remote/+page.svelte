<script lang="ts">
    import AppPage from "$lib/components/AppPage.svelte";
    import { OBSPlugin, permissions } from "@omujs/obs";
    import { Omu } from "@omujs/omu";
    import {
        ASSET_DELETE_PERMISSION_ID,
        ASSET_DOWNLOAD_PERMISSION_ID,
        ASSET_UPLOAD_PERMISSION_ID,
    } from "@omujs/omu/api/asset";
    import { REMOTE_APP_REQUEST_PERMISSION_ID } from "@omujs/omu/api/server";
    import { AppHeader, setClient } from "@omujs/ui";
    import { BROWSER } from "esm-env";
    import { onMount } from "svelte";
    import { APP } from "./app.js";
    import App from "./App.svelte";
    import { RemoteApp } from "./remote-app.js";

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    const remote = new RemoteApp(omu, "app");
    setClient(omu);

    if (BROWSER) {
        onMount(() => {
            omu.permissions.require(
                permissions.OBS_SOURCE_CREATE_PERMISSION_ID,
                REMOTE_APP_REQUEST_PERMISSION_ID,
                ASSET_UPLOAD_PERMISSION_ID,
                ASSET_DOWNLOAD_PERMISSION_ID,
                ASSET_DELETE_PERMISSION_ID,
            );
            omu.start();
        });
    }

    const promise = new Promise<void>((resolve) => {
        omu.onReady(() => {
            resolve();
        });
    });
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={omu.app} />
    </header>
    {#await promise}
        <p>loading...</p>
    {:then}
        <App {omu} {obs} {remote} />
    {/await}
</AppPage>

<style lang="scss">
</style>
