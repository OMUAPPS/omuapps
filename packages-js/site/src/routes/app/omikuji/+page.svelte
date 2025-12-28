<script lang="ts">
    import { browser } from '$app/environment';
    import { Chat, ChatPermissions } from '@omujs/chat';
    import { OBSPermissions, OBSPlugin } from '@omujs/obs';
    import { Omu, OmuPermissions } from '@omujs/omu';
    import { setGlobal } from '@omujs/ui';
    import { OMIKUJI_APP } from './app';
    import App from './App.svelte';
    import { OmikujiApp } from './omikuji-app';

    const omu = new Omu(OMIKUJI_APP, {});
    const obs = OBSPlugin.create(omu);
    const chat = Chat.create(omu);
    const omikuji = OmikujiApp.create(omu);
    setGlobal({ omu, obs });

    if (browser) {
        omu.permissions.require(
            OmuPermissions.REGISTRY_PERMISSION_ID,
            OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
            OmuPermissions.GENERATE_TOKEN_PERMISSION_ID,
            OBSPermissions.OBS_SOURCE_CREATE_PERMISSION_ID,
            ChatPermissions.CHAT_PERMISSION_ID,
        );
        omu.start();
    }
</script>

{#await omu.waitForReady() then}
    <App {omikuji} {chat} />
{/await}
