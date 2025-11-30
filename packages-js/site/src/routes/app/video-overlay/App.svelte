<script lang="ts">
    import { type Omu } from '@omujs/omu';
    import { AssetButton } from '@omujs/ui';
    import { onDestroy } from 'svelte';
    import type { Message } from '../discord-overlay/discord/type';
    import { VIDEO_OVERLAY_ASSET_APP } from './app';
    import AppSession from './AppSession.svelte';
    import { unshorten } from './shortener';
    import type { VideoOverlayApp } from './video-overlay-app';

    interface Props {
        omu: Omu;
        overlayApp: VideoOverlayApp;
    }

    let { overlayApp }: Props = $props();
    let { config, discord } = overlayApp;
    let { channelMessageSignal, sessions, voiceStates } = discord;

    function matchPassCode(message: Message): string | undefined {
        const regex = /(?<code>\u200b.+)\n/gm;
        const shortenedCode = regex.exec(message.content)?.groups?.code;
        if (!shortenedCode) return;
        const code = unshorten(shortenedCode);
        return code;
    }

    onDestroy(channelMessageSignal.listen(({ message }) => {
        const code = matchPassCode(message);
        if (code) {
            $config.channels[message.channel_id] = {
                password: code,
            };
        }
    }));
</script>

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
