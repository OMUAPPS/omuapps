<script lang="ts">
    import { type Omu } from '@omujs/omu';
    import { AssetButton } from '@omujs/ui';
    import { VIDEO_OVERLAY_ASSET_APP } from './app';
    import AppSession from './AppSession.svelte';
    import type { VideoOverlayApp } from './video-overlay-app';

    interface Props {
        omu: Omu;
        overlayApp: VideoOverlayApp;
    }

    let { overlayApp }: Props = $props();
    let { config } = overlayApp;
    let { sessions, voiceStates } = overlayApp.discord;
</script>

<button onclick={() => {
    $config.channels = {};
}}>
    認証情報をリセット
</button>
<ul>
    {#each Object.entries($sessions) as [port, session] (port)}
        {@const channel = $sessions[port].selected_voice_channel}
        {#if session && channel && $voiceStates[port]}
            <AppSession {session} {channel} voiceStates={$voiceStates[port]} {overlayApp} />
        {/if}
    {/each}
</ul>
<div class="asset">
    <AssetButton asset={VIDEO_OVERLAY_ASSET_APP} single />
</div>
