<script lang="ts">
    import { Omu, OmuPermissions } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import AvatarRenderer from '../components/AvatarRenderer.svelte';
    import { DiscordOverlayApp } from '../discord-overlay-app';
    import { VOICE_CHAT_PERMISSION_ID } from '../plugin/plugin';

    interface Props {
        omu: Omu;
    }

    let { omu }: Props = $props();
    const overlayApp = DiscordOverlayApp.create(omu, 'asset');
    const { config, discord: { speakingStates, voiceStates, sessions } } = overlayApp;

    if (BROWSER) {
        omu.permissions.require(
            OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
            OmuPermissions.REGISTRY_PERMISSION_ID,
            OmuPermissions.HTTP_REQUEST_PERMISSION_ID,
            VOICE_CHAT_PERMISSION_ID,
            OmuPermissions.ASSET_PERMISSION_ID,
        );
        omu.start();
    }

    let port = $derived(Object.entries($sessions).find(([, session]) => session.user.id === $config.user_id)?.[0]);
</script>

<main>
    {#await omu.waitForReady() then}
        {#if port
            && $sessions[port]
            && $speakingStates[port]
            && $voiceStates[port]}
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
