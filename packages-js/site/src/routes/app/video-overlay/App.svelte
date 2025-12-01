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
    let port = $derived(Object.entries($sessions).find(([, session]) => session.user.id === $config.user)?.[0]);
</script>

{#if port}
    {@const session = $config.user ? $sessions[port] : undefined}
    {@const channel = session?.selected_voice_channel}
    {#if session && channel && $voiceStates[port]}
        <AppSession {session} {channel} voiceStates={$voiceStates[port]} {overlayApp} />
    {:else}
        <p>ユーザーが見つかりません</p>
        <div class="accounts">
            {#each Object.entries($sessions) as [id, session] (id)}
                <Button primary onclick={() => {$config.user = session.user.id;}}>
                    {session.user.global_name ?? session.user.username}
                </Button>
            {/each}
        </div>
    {/if}
{:else}
    <div class="accounts">
        {#each Object.entries($sessions) as [id, session] (id)}
            <Button primary onclick={() => {$config.user = session.user.id;}}>
                {session.user.global_name ?? session.user.username}
            </Button>
        {/each}
    </div>
{/if}
