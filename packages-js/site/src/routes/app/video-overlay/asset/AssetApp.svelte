<script lang="ts">
    import { browser } from '$app/environment';
    import { Identifier, OmuPermissions, type Omu } from '@omujs/omu';
    import { Spinner } from '@omujs/ui';
    import type { RPCSession, SelectedVoiceChannel } from '../../discord-overlay/discord/discord';
    import { VOICE_CHAT_PERMISSION_ID } from '../../discord-overlay/plugin/plugin';
    import { ARC4 } from '../../omucafe/game/random';
    import { VIDEO_OVERLAY_APP } from '../app';
    import { Connection } from '../connection';
    import { RTCConnector, SignalServerSDPTransport, type ErrorKind, type ParticipantInfo } from '../signaling';
    import { VideoOverlayApp } from '../video-overlay-app';

    interface Props {
        omu: Omu;
    }

    let { omu }: Props = $props();
    const overlayApp = new VideoOverlayApp(omu);
    const { config } = overlayApp;

    let parcitipants: Record<string, ParticipantInfo & {
        side: 'page' | 'asset';
        userId: string;
    }> = $state({});

    let remoteVideos: Record<string, {
        type: 'started';
    } | {
        type: 'requested';
    } | {
        type: 'played';
        stream: MediaStream;
    }> = $state({});

    let loginState: {
        type: 'logging_in';
    } | {
        type: 'logged_out';
    } | {
        type: 'joining';
    } | {
        type: 'logged_in';
        signaling: SignalServerSDPTransport;
        roomPassword: string;
    } | {
        type: 'failed';
        kind: ErrorKind;
    } = $state({ type: 'logging_in' });

    const password = ARC4.fromNumber(Date.now()).getString(16);

    const connections: Record<string, Connection> = {};

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

        const updateParticipants = (newParticipants: Record<string, ParticipantInfo>) => {
            for (const [idStr, info] of Object.entries(newParticipants)) {
                if (idStr === loginId) continue;
                if (connections[idStr]) continue;
                const connection = signalConnector.connect(idStr);
                const conn = connections[idStr] = new Connection(loginInfo.login.id, connection, {});
                conn.send({ type: 'ready' });
                connection.offer();
                const id = Identifier.fromKey(idStr);
                parcitipants[idStr] = {
                    ...info,
                    side: id.path[id.path.length - 1] === 'asset' ? 'asset' : 'page',
                    userId: id.path[id.path.length - 2],
                };
            }
        };

        const handlers: SignalServerSDPTransport['handlers'] = {
            joined: () => {
                loginState = {
                    type: 'logged_in',
                    roomPassword,
                    signaling: signalServer,
                };
            },
            error: (kind, message) => {
                console.error(`Signaling error [${kind}]: ${message}`);
                loginState = { type: 'failed', kind };
            },
            updateParticipants: async (peerParticipants) => {
                updateParticipants(peerParticipants);
            },
        };
        const signalServer = await SignalServerSDPTransport.new(omu, loginInfo, handlers);
        const signalConnector = new RTCConnector(signalServer, loginInfo.login.id);
    }

    let { sessions, speakingStates } = overlayApp.discord;

    let status = $derived.by(() => {
        if (!$config.user) return 'ログインしていません';
        const session = $sessions[$config.user];
        if (!session || !session.selected_voice_channel) return 'チャンネルに接続していません';
        const channel = $config.channels[session.selected_voice_channel.ref.channel_id];
        if (!channel) return 'パスワードが設定されていません';
    });

    $effect(() => {
        if (!$config.user) return;
        const session = $sessions[$config.user];
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
    {@const { signaling } = loginState}
    <div class="videos">
        {#each Object.entries(parcitipants).filter(([id]) => id !== signaling.id) as [id, participant] (id)}
            {#if remoteVideos[id]}
                {@const video = remoteVideos[id]}
                <div class="video" class:speaking={$speakingStates[$config.user!].states[participant.userId]?.speaking}>
                    {#if video.type === 'played'}
                        {#key video.stream}
                            {@const load = (node: HTMLVideoElement) => {
                                node.srcObject = video.stream!;
                            }}
                            <video playsinline autoplay muted use:load></video>
                            <p>{participant.name}</p>
                        {/key}
                    {:else if video.type === 'requested'}
                        <Spinner />
                    {/if}
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
