<script lang="ts">
    import { Chat, ChatPermissions } from "@omujs/chat";
    import { OBSPermissions, OBSPlugin } from "@omujs/obs";
    import { Omu, OmuPermissions } from "@omujs/omu";
    import { AppHeader, AppPage, setGlobal } from "@omujs/ui";
    import { BROWSER } from "esm-env";
    import { CHAT_OVERLAY_APP } from "./app.js";
    import App from "./App.svelte";
    import { ChatOverlayApp } from "./chat-app.js";

    const omu = new Omu(CHAT_OVERLAY_APP);
    const chat = Chat.create(omu);
    const obs = OBSPlugin.create(omu);
    const overlayApp = new ChatOverlayApp(omu, chat);
    setGlobal({ omu, chat, obs });

    if (BROWSER) {
        omu.permissions.require(
            OmuPermissions.GENERATE_TOKEN_PERMISSION_ID,
            OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
            OmuPermissions.REGISTRY_PERMISSION_ID,
            OmuPermissions.ASSET_PERMISSION_ID,
            OmuPermissions.DASHBOARD_WEBVIEW_PERMISSION_ID,
            OmuPermissions.DASHBOARD_APP_CLOSE_PERMISSION_ID,
            OmuPermissions.DASHBOARD_APP_STARTUP_PERMISSION_ID,
            OBSPermissions.OBS_SOURCE_CREATE_PERMISSION_ID,
            ChatPermissions.CHAT_PERMISSION_ID,
        );
        omu.start();
    }

    let promise = new Promise<void>((resolve) => {
        omu.onReady(async () => {
            resolve();
        });
    });
</script>

<AppPage>
    {#snippet header()}
        <header>
            <AppHeader app={omu.app} />
        </header>
    {/snippet}
    {#await promise then}
        <App {omu} {overlayApp} />
    {/await}
</AppPage>
