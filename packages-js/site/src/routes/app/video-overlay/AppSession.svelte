<script lang="ts">
    import { Button, omu, Spinner } from '@omujs/ui';
    import { onDestroy } from 'svelte';
    import type { RPCSession, RPCVoiceStates, SelectedVoiceChannel } from '../discord-overlay/discord/discord';
    import { ARC4 } from '../omucafe/game/random';
    import { VIDEO_OVERLAY_APP } from './app';
    import { Socket, type Payload } from './connection';
    import { shorten, unshorten } from './shortener';
    import { RTCConnector, SignalServerSDPTransport, type ErrorKind, type ParticipantInfo, type PeerConnection } from './signaling';
    import type { VideoOverlayApp } from './video-overlay-app';

    interface Props {
        session: RPCSession;
        channel: SelectedVoiceChannel;
        voiceStates: RPCVoiceStates;
        overlayApp: VideoOverlayApp;
    }

    let { session, channel, overlayApp }: Props = $props();
    const { config } = overlayApp;

    let participants: Record<string, ParticipantInfo> = $state({});
    let remoteVideos: Record<string, {
        type: 'started';
        thumbnail: string;
        request: () => void;
    } | {
        type: 'requested';
        thumbnail: string;
        stream: undefined;
    } | {
        type: 'playing';
        thumbnail: string;
        stream: MediaStream;
        close: () => void;
    }> = $state({});

    let loginState: {
        type: 'logging_in';
    } | {
        type: 'logged_out';
    } | {
        type: 'joining';
    } | {
        type: 'logged_in';
        roomPassword: string;
        share: () => void;
    } | {
        type: 'failed';
        kind: ErrorKind;
    } = $state({ type: 'logging_in' });

    let stream: MediaStream | null = $state(null);
    const random = ARC4.fromNumber(Date.now());
    const loginPassword = random.getString(16);
    let localVideo: HTMLVideoElement | null = null;

    const roomId = VIDEO_OVERLAY_APP.id.join(channel.guild.id, channel.channel.id).key();
    const loginId = VIDEO_OVERLAY_APP.id.join(session.user.id, 'user').key();

    function captureVideo(video: HTMLVideoElement) {
        const canvas = document.createElement('canvas');
        const scale = 1;
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        const canvasContext = canvas.getContext('2d')!;
        canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/png');
    }

    const connections: Record<string, PeerConnection> = {};

    async function init(roomPassword: string) {
        const loginInfo = {
            login: {
                id: loginId,
                password: loginPassword,
            },
            auth: {
                id: roomId,
                password: roomPassword,
            },
            info: {
                name: session.user.global_name ?? session.user.username,
                version: $omu.app.version ?? '0.0.0',
            },
        };

        const handlers: SignalServerSDPTransport['handlers'] = {
            joined: () => {
                loginState = {
                    type: 'logged_in',
                    roomPassword,
                    async share() {
                        stream = await navigator.mediaDevices.getDisplayMedia({
                            audio: true,
                            video: true,
                        });
                        localVideo!.srcObject = stream;
                        broadcastPayload({
                            type: 'sharing',
                        });
                        localVideo!.requestVideoFrameCallback(() => {
                            const frame = captureVideo(localVideo!);
                            broadcastPayload({
                                type: 'share_started',
                                thumbnail: frame,
                            });
                        });
                    },
                };
            },
            error(kind, message) {
                console.error(`Signaling error [${kind}]: ${message}`);
                loginState = { type: 'failed', kind };
            },
            updateParticipants: async (peerParticipants) => {
                updateParticipants(peerParticipants);
                if (stream) {
                    broadcastPayload({
                        type: 'share_started',
                        thumbnail: captureVideo(localVideo!),
                    });
                }
            },
        };
        const signalServer = await SignalServerSDPTransport.new($omu, loginInfo, handlers);
        const signalConnector = new RTCConnector(signalServer, loginInfo.login.id);

        const broadcastPayload = (payload: Payload) => {
            for (const peer of Object.values(connections)) {
                socket.send(peer, payload);
            }
        };

        const updateParticipants = (newParticipants: Record<string, ParticipantInfo>) => {
            console.log(newParticipants);
            for (const key of Object.keys(connections)) {
                if (!newParticipants[key]) continue;
                delete connections[key];
            }
            for (const id of Object.keys(newParticipants)) {
                if (id === loginId) continue;
                if (connections[id]) continue;
                console.log(`connecting to ${id}`);
                const conn = connections[id] = signalConnector.connect(id);
                conn.offer();
            }
            participants = newParticipants;
        };
        const socket = new Socket(signalConnector, {
            payload: (sender, payload) => {
                console.log(sender.id, payload);
                if (payload.type === 'request') {
                    if (!stream) {
                        console.warn('No stream to share');
                        return;
                    }
                    socket.setStream(sender, stream);
                } else if (payload.type === 'share_started') {
                    console.log(`Participant ${sender.id} started sharing`);
                    remoteVideos[sender.id] = {
                        type: 'started',
                        request: () => socket.requestStream(sender),
                        thumbnail: payload.thumbnail,
                    };
                }
            },
            mediaAdded: (sender, media) => {
                console.log('media added');
                remoteVideos[sender.id] = {
                    type: 'playing',
                    stream: media,
                    close() {
                        remoteVideos[sender.id] = {
                            type: 'started',
                            request: () => socket.requestStream(sender),
                            thumbnail: remoteVideos[sender.id].thumbnail,
                        };
                    },
                    thumbnail: remoteVideos[sender.id].thumbnail,
                };
            },
        });

        loginState = { type: 'joining' };
    }

    $effect(() => {
        const roomPassword = $config.channels[channel.ref.channel_id]?.password;
        if (roomPassword) {
            init(roomPassword);
        } else {
            loginState = { type: 'logged_out' };
        }
    });

    const { channelMessageSignal } = overlayApp.discord;
    onDestroy(channelMessageSignal.listen(({ port, message }) => {
        if (port !== session.port) return;
        console.log(message.content);
        const regex = /(?<code>\u200b.+)\n/gm;
        const code = regex.exec(message.content)?.groups?.code;
        if (!code) return;
        const unshortened = unshorten(code);
        console.log(`Received code: ${unshortened}`);
        if (!unshortened) return;
        $config.channels[channel.ref.channel_id] = {
            password: unshortened,
        };
        init(unshortened);
    }));
</script>

<video playsinline autoplay muted hidden bind:this={localVideo}></video>
<div class="session">
    {#if loginState.type === 'logging_in'}
        <h2>ログイン中<Spinner /></h2>
    {:else if loginState.type === 'logged_out'}
        パスワードを設定
        以下からコピーして参加しているボイスチャットのチャットに送信してください
        <button onclick={() => {
            const shortened = shorten(random.getString(16));
            console.log('copy pass', shortened);
            const text = `# ビデオオーバーレイ認証メッセージ${shortened}\n ⚠️警告: このメッセージを見れる人はボイスチャットに参加せずに配信を見ることができます。安全なボイスチャットで使用することを推奨します。`;

            navigator.clipboard.writeText(text);
        }}>
            コピー
        </button>
    {:else if loginState.type === 'logged_in'}
        <h2>{session.user.global_name}</h2>
        <h2>{session.user.id}</h2>
        <button onclick={() => {
            $config.user = session.port.toString();
        }}>このユーザーにログイン</button>
        <button onclick={loginState.share}>画面を共有</button>
        {@const state = loginState}
        他の人を招待
        以下からコピーして参加しているボイスチャットのチャットに送信してください
        <button onclick={() => {
            const shortened = shorten(state.roomPassword);
            console.log('copy pass', shortened);
            const text = `# ビデオオーバーレイ認証メッセージ${shortened}\n ⚠️警告: このメッセージを見れる人はボイスチャットに参加せずに配信を見ることができます。安全なボイスチャットで使用することを推奨します。`;

            navigator.clipboard.writeText(text);
        }}>
            招待をコピー
        </button>
        <ul>
            {#each Object.entries(participants).filter((([id]) => id.endsWith('user'))) as [id, participant] (id)}
                <li>
                    {participant.name}
                    {#if remoteVideos[id] && id !== loginId}
                        {@const video = remoteVideos[id]}
                        <div class="video">
                            {#if video.type === 'started'}
                                <button onclick={video.request}>Request Video</button>
                                <!-- Thumbnail -->
                                <img src={video.thumbnail} alt="Thumbnail" />
                            {:else if video.type === 'playing'}
                                {#key video.stream}
                                    {@const load = (node: HTMLVideoElement) => {
                                        node.srcObject = video.stream;
                                    }}
                                    <div>
                                        <button onclick={video.close}>Close</button>
                                    </div>
                                    <video playsinline autoplay muted use:load></video>
                                {/key}
                            {/if}
                        </div>
                    {/if}
                </li>
            {/each}
        </ul>
    {:else if loginState.type === 'failed'}
        <h2>ログイン失敗</h2>
        {#if loginState.kind === 'invalid_login'}
            <p>ログインに失敗しました</p>
            <small>もう一度やり直してください。</small>
        {:else if loginState.kind === 'invalid_password'}
            <p>パスワードが無効です</p>
            <small>すでに参加している人から招待を受けてください。</small>
        {:else}
            <p>不明なエラーが発生しました</p>
            <code>{loginState.kind}</code>
        {/if}
        {#if loginState.kind !== 'invalid_password'}
            <Button onclick={() => {
                loginState = { type: 'logged_out' };
            }} primary>
                再試行
            </Button>
        {/if}
    {:else if loginState.type === 'joining'}
        <h2>参加中<Spinner /></h2>
    {/if}
</div>
<ul>
    {#each Object.entries(participants) as [id] (id)}
        <li>
            {id}
        </li>
    {/each}
</ul>

<style lang="scss">
    .video {
        width: 10rem;
        height: 10rem;

        > video, img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
    }

    .session {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        background: var(--color-bg-2);
        margin: 1rem;
        padding: 1rem;
    }
</style>
