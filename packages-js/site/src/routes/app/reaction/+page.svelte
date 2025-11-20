<script lang="ts">
    import { Chat, ChatPermissions } from '@omujs/chat';
    import { OBSPermissions, OBSPlugin } from '@omujs/obs';
    import { Omu, OmuPermissions } from '@omujs/omu';
    import {
        AppHeader,
        AppPage,
        setGlobal,
    } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP } from './app.js';
    import App from './App.svelte';
    import { ReactionApp } from './reaction-app.js';

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    const chat = Chat.create(omu);
    const reactionApp = new ReactionApp(omu, chat);
    setGlobal({ omu, chat, obs });

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
    {#snippet header()}
        <header >
            <AppHeader app={APP} />
        </header>
    {/snippet}
    <main>
        {#await omu.waitForReady() then }
            <App {omu} {reactionApp} />
        {/await}
    </main>
</AppPage>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding-left: 2rem;
    }
</style>
