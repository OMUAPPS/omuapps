<script lang="ts">
    import { browser } from '$app/environment';
    import { OmuPermissions, type Omu } from '@omujs/omu';
    import { Spinner } from '@omujs/ui';
    import type { RPCSession, SelectedVoiceChannel } from '../../discord-overlay/discord/discord';
    import { VOICE_CHAT_PERMISSION_ID } from '../../discord-overlay/plugin/plugin';
    import { ARC4 } from '../../omucafe/game/random';
    import { VIDEO_OVERLAY_APP } from '../app';
    import { Socket, type SocketParticipant } from '../rtc/connection';
    import { type ErrorKind } from '../rtc/signaling';
    import { VideoOverlayApp } from '../video-overlay-app';

    interface Props {
        omu: Omu;
    }

    let { omu }: Props = $props();
    const overlayApp = new VideoOverlayApp(omu);
    const { config } = overlayApp;

    let participants: Record<string, SocketParticipant> = $state({});

    let loginState: {
        type: 'logging_in' | 'logged_out' | 'joining';
    } | {
        type: 'logged_in';
    } | {
        type: 'failed';
        kind: ErrorKind;
    } = $state({ type: 'logging_in' });

    const password = ARC4.fromNumber(Date.now()).getString(16);

    async function init(channel: SelectedVoiceChannel, session: RPCSession, roomPassword: string) {
        const roomId = VIDEO_OVERLAY_APP.id.join(channel.guild.id, channel.channel.id).key();
        const loginId = VIDEO_OVERLAY_APP.id.join(session.user.id, 'asset').key();
        const loginInfo = {
            login: {
                id: loginId,
                password,
            },
            auth: {
                id: roomId,
                password: roomPassword,
            },
            info: {
                name: session.user.global_name ?? session.user.username,
                version: omu.app.version ?? '0.0.0',
            },
        };

        Socket.new(omu, loginInfo, {
            handleStreamStarted: (sender, stream) => {
                console.log(`Participant ${sender.id} started sharing`);
                stream.request();
            },
            loggedIn: (): void => {
                loginState = { type: 'logged_in' };
            },
            handleError: (kind) => {
                loginState = { type: 'failed', kind };
            },
            updateParticipants: (updatedParticipants: Record<string, SocketParticipant>): void => {
                participants = updatedParticipants;
            },
        });
    }

    let { sessions, speakingStates, voiceStates } = overlayApp.discord;

    let status = $derived.by(() => {
        if (!$config.user) return 'ログインしていません';
        let port = Object.entries($sessions).find(([, session]) => session.user.id === $config.user)?.[0];
        if (!port) return 'ユーザーがありません';
        const session = $sessions[port];
        if (!session || !session.selected_voice_channel) return 'チャンネルに接続していません';
        const channel = $config.channels[session.selected_voice_channel.ref.channel_id];
        if (!channel) return 'パスワードが設定されていません';
    });

    $effect(() => {
        if (!$config.user) return;
        let port = Object.entries($sessions).find(([, session]) => session.user.id === $config.user)?.[0];
        if (!port) return;
        const session = $sessions[port];
        if (!session || !session.selected_voice_channel) return;
        const channel = $config.channels[session.selected_voice_channel.ref.channel_id];
        if (!channel) return;
        loginState = { type: 'joining' };
        init(session.selected_voice_channel, session, channel.password);
    });

    if (browser) {
        omu.permissions.require(
            VOICE_CHAT_PERMISSION_ID,
            OmuPermissions.HTTP_REQUEST_PERMISSION_ID,
        );
        omu.start();
    }
</script>
{#if status}
    <div class="overlay">
        {status}
    </div>
{/if}
{#if loginState.type === 'logged_in'}
    <div class="videos">
        {#each Object.entries(participants) as [id, participant] (id)}
            {@const { stream } = participant}
            {#if stream}
                <div class="video" class:speaking={$speakingStates[$config.user!].states[participant.userId]?.speaking}>
                    {#if stream.type === 'playing'}
                        {#key stream.media}
                            {@const load = (node: HTMLVideoElement) => {
                                console.log(stream.media);
                                node.srcObject = stream.media;
                                stream.media.getTracks().forEach((track) => {
                                    console.log(track);
                                });
                                return {
                                    update() {
                                        node.srcObject = stream.media;
                                    },
                                    destroy() {
                                        node.srcObject = null;
                                    },
                                };
                            }}
                            <video playsinline autoplay muted use:load onload={() => {
                                console.log('video loaded!');
                            }}></video>
                            <p>{participant.name}</p>
                        {/key}
                    {:else if stream.type === 'started'}
                        <Spinner />
                    {/if}
                </div>
            {:else}
                {@const user = $voiceStates[$config.user!].states[participant.userId]?.user}
                <div class="video" class:speaking={$speakingStates[$config.user!].states[participant.userId]?.speaking}>
                    <img src={user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'} alt="">
                </div>
            {/if}
        {/each}
    </div>
{/if}

<style>
    .overlay {
        position: absolute;
        inset: 0;
    }

    .videos {
        position: absolute;
        inset: 0;
        margin: 1rem;
        display: flex;
        align-items: flex-end;
        justify-content: flex-end;
        gap: 1.5rem;
        font-size: 8px;
    }

    .video {
        position: relative;
        flex: 1;
        inset: 0;
        width: fit-content;
        height: 100%;
        max-height: fit-content;
        max-width: fit-content;
        display: flex;
        align-items: flex-end;
        justify-content: flex-end;
        border: 1px solid #111;
        border-radius: 4px;

        > video {
            inset: 0;
            object-fit: contain;
            width: 100%;
            max-width: max(fit-content, min(100vh, 100vw));
            height: 100%;
            max-height: max(fit-content, min(100vh, 100vw));
            border-radius: 4px;
        }

        > p {
            position: absolute;
            bottom: 0;
            right: 0;
            margin: 1rem;
            padding: 0.25em 0.5em;
            background: #111;
            color: #eee;
            font-size: 2em;
            border-radius: 3px;
        }

        &.speaking {
            outline: 4px solid var(--color-1);
            border-radius: 4px;
        }
    }
</style>
