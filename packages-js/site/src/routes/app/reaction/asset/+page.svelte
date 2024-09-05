<script lang="ts">
    import { page } from '$app/stores';
    import AssetPage from '$lib/components/AssetPage.svelte';
    import { Chat } from '@omujs/chat';
    import { CHAT_REACTION_PERMISSION_ID } from '@omujs/chat/permissions.js';
    import { App, Omu } from '@omujs/omu';
    import { setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP_ID } from '../app.js';
    import ReactionOverlay from '../components/ReactionRenderer.svelte';
    import { ReactionApp } from '../reaction-app.js';

    let assetId = BROWSER && $page.url.searchParams.get('assetId');
    const id = assetId || Date.now().toString();
    const app = new App(APP_ID.join('asset', id), {
        version: '0.1.0',
    });
    const omu = new Omu(app);
    const chat = new Chat(omu);
    setClient(omu);
    let reactionApp = new ReactionApp(omu, chat);

    if (BROWSER) {
        omu.permissions.require(CHAT_REACTION_PERMISSION_ID);
        omu.start();
    }
</script>

{#if id}
    <AssetPage>
        <ReactionOverlay {omu} {reactionApp} />
    </AssetPage>
{:else}
    <p>id is not provided</p>
{/if}

<style>
    :global(body) {
        background: transparent !important;
    }
</style>
