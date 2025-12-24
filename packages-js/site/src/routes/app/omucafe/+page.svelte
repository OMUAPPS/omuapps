<script lang="ts">
    import { Chat, ChatPermissions } from '@omujs/chat';
    import { OBSPermissions, OBSPlugin } from '@omujs/obs';
    import { Omu, OmuPermissions } from '@omujs/omu';
    import {
        AppPage,
        setGlobal,
    } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { OMUCAFE_APP } from './app';
    import App from './App.svelte';
    import { OmucafeApp } from './omucafe-app';

    const omu = new Omu(OMUCAFE_APP);
    OmucafeApp.create(omu);
    const obs = OBSPlugin.create(omu);
    const chat = Chat.create(omu);
    setGlobal({ omu, obs, chat });

    if (BROWSER) {
        omu.permissions.require(
            OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
            OmuPermissions.REGISTRY_PERMISSION_ID,
            OmuPermissions.GENERATE_TOKEN_PERMISSION_ID,
            OmuPermissions.ASSET_PERMISSION_ID,
            OBSPermissions.OBS_SOURCE_CREATE_PERMISSION_ID,
            ChatPermissions.CHAT_REACTION_PERMISSION_ID,
        );
        omu.start();
    }
</script>

<AppPage>
    {#await omu.waitForReady() then }
        <App />
    {/await}
</AppPage>

