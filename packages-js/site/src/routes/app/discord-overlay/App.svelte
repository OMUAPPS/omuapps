<script lang="ts">
    import { OmuPermissions } from '@omujs/omu';
    import { AssetButton } from '@omujs/ui';
    import { onMount } from 'svelte';
    import { ASSET_APP } from './app';
    import AppUser from './AppUser.svelte';
    import AccountSwitcher from './components/AccountSwitcher.svelte';
    import { DiscordOverlayApp } from './discord-overlay-app.js';
    import { VOICE_CHAT_PERMISSION_ID } from './plugin/plugin';
    import { dragState, selectedAvatar } from './states.js';

    export let overlayApp: DiscordOverlayApp;
    const { config, discord: { sessions, speakingStates, voiceStates } } = overlayApp;

    $: port = Object.entries($sessions).find(([, session]) => session.user.id === $config.user_id)?.[0];

    onMount(() => {
        const values = Object.values($sessions);
        if (!port && values.length > 0) {
            $config.user_id = values[0].user.id;
        }
    });
</script>

<main>
    {#if port
        && $sessions[port]
        && $speakingStates[port]
        && $voiceStates[port]
    }
        <AppUser
            {overlayApp}
            session={$sessions[port]}
            speakingState={$speakingStates[port]}
            voiceState={$voiceStates[port]}
        />
    {/if}
    {#if !$dragState && !$selectedAvatar}
        <div class="menu">
            <h4>
                配信ソフトに追加する
                <i class="ti ti-arrow-bar-to-down"></i>
            </h4>
            <section style="margin-bottom: auto;">
                <AssetButton
                    asset={ASSET_APP}
                    permissions={[
                        OmuPermissions.ASSET_DOWNLOAD_PERMISSION_ID,
                        VOICE_CHAT_PERMISSION_ID,
                    ]}
                    dimensions={{ width: 1920, height: 1080 }}
                />
            </section>
            <AccountSwitcher session={port ? $sessions[port] : undefined} />
        </div>
    {/if}
</main>

<style lang="scss">
    :global(body) {
        overflow: hidden;
    }

    main {
        position: absolute;
        inset: 0;
        color: var(--color-1);
        container-type: inline-size;
        display: flex;
        flex-direction: column;
    }

    .menu {
        position: absolute;
        top: 0;
        bottom: 0;
        gap: 1rem;
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        z-index: 1;
        width: 20rem;
        margin: 1rem;
        animation: slide-in 0.0621s ease;
    }

    @keyframes slide-in {
        from {
            transform: translateX(-0.5rem);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
</style>
