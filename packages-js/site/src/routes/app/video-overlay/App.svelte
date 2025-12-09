<script lang="ts">
    import { type Omu } from '@omujs/omu';
    import { Button } from '@omujs/ui';
    import AppSession from './AppSession.svelte';
    import type { VideoOverlayApp } from './video-overlay-app';

    interface Props {
        omu: Omu;
        overlayApp: VideoOverlayApp;
    }

    let { overlayApp }: Props = $props();
    let { config, discord } = overlayApp;
    let { sessions, voiceStates } = discord;
    let currentPort = $derived(Object.entries($sessions).find(([, session]) => session.user.id === $config.user)?.[0]);
</script>

<div class="sessions">
    {#each Object.entries($sessions) as [port, session] (port)}
        {@const channel = session?.selected_voice_channel}
        {#if session && channel && $voiceStates[port]}
            {@const selected = port === currentPort}
            <div data-port={port} class="session" class:selected>
                <AppSession {session} {channel} voiceStates={$voiceStates[port]} {overlayApp} />
            </div>
        {/if}
    {/each}
</div>
<div class="accounts">
    {#each Object.entries($sessions) as [id, session] (id)}
        <Button primary onclick={() => {$config.user = session.user.id;}}>
            {session.user.global_name ?? session.user.username}
        </Button>
    {/each}
</div>

<style lang="scss">
    .accounts {
        z-index: 1;
    }

    .session {
        display: none;
    }

    .selected {
        display: block;
    }
</style>
