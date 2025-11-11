<script lang="ts">
    import { Omu, OmuPermissions } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import AvatarRenderer from '../components/AvatarRenderer.svelte';
    import { DiscordOverlayApp } from '../discord-overlay-app';
    import { VOICE_CHAT_PERMISSION_ID } from '../plugin/plugin';

    export let omu: Omu;
    const overlayApp = DiscordOverlayApp.create(omu, 'asset');
    const { config, discord: { speakingStates, voiceStates, sessions } } = overlayApp;

    if (BROWSER) {
        omu.permissions.require(
            VOICE_CHAT_PERMISSION_ID,
            OmuPermissions.ASSET_DOWNLOAD_PERMISSION_ID,
        );
        omu.start();
    }

    $: port = Object.entries($sessions).find(([, session]) => session.user.id === $config.user_id)?.[0];
</script>

<main>
    {#await omu.waitForReady() then}
        {#if port}
            <AvatarRenderer
                {overlayApp}
                speakingState={$speakingStates[port]}
                voiceState={$voiceStates[port]}
            />
        {/if}
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
