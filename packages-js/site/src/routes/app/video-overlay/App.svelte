<script lang="ts">
    import { type Omu } from '@omujs/omu';
    import AppSession from './AppSession.svelte';
    import type { VideoOverlayApp } from './video-overlay-app';

    interface Props {
        omu: Omu;
        overlayApp: VideoOverlayApp;
    }

    let { overlayApp }: Props = $props();
    let { config, discord } = overlayApp;
    let { sessions, voiceStates } = discord;
    let session = $derived($config.user ? $sessions[$config.user] : undefined);
    let channel = $derived(session?.selected_voice_channel);
</script>

{#if $config.user && session && channel && $voiceStates[$config.user]}
    <AppSession {session} {channel} voiceStates={$voiceStates[$config.user]} {overlayApp} />
{/if}
