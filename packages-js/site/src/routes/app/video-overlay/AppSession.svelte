<script lang="ts">
    import { Button, omu, Spinner } from '@omujs/ui';
    import type { RPCSession, RPCVoiceStates, SelectedVoiceChannel } from '../discord-overlay/discord/discord';
    import { ARC4 } from '../omucafe/game/random';
    import { VIDEO_OVERLAY_APP } from './app';
    import { Socket, type SocketParticipant } from './rtc/connection';
    import { type ErrorKind, type LoginOptions } from './rtc/signaling';
    import { captureVideoFrame } from './rtc/video';
    import { shorten } from './shortener';
    import type { VideoOverlayApp } from './video-overlay-app';

    interface Props {
        session: RPCSession;
        channel: SelectedVoiceChannel;
        voiceStates: RPCVoiceStates;
        overlayApp: VideoOverlayApp;
    }

    let { session, channel, overlayApp }: Props = $props();
    const { config } = overlayApp;

    let participants: Record<string, SocketParticipant> = $state({});

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

    let media: MediaStream | undefined = $state(undefined);
    const random = ARC4.fromNumber(Date.now());
    const loginPassword = random.getString(16);
    let localVideo: HTMLVideoElement | undefined = undefined;
    let loginId = $derived(VIDEO_OVERLAY_APP.id.join(session.user.id, 'user').key());
    let roomId = $derived(VIDEO_OVERLAY_APP.id.join(channel.guild.id, channel.channel.id).key());

    async function createSocket(loginInfo: LoginOptions) {
        const socket = await Socket.new($omu, loginInfo, {
            share: async () => {
                media = await navigator.mediaDevices.getDisplayMedia({
                    audio: false,
                    video: {
                        frameRate: 15,
                    },
                });
                localVideo!.srcObject = media;
                const getThumbnail = new Promise<void>((resolve) => {
                    localVideo!.requestVideoFrameCallback(() => {
                        // const frame = captureVideoFrame(localVideo!);
                        resolve();
                    });
                });
                await getThumbnail;
                return {
                    media,
                // thumbnail: await getThumbnail,
                };
            },
            loggedIn: () => {
                loginState = {
                    type: 'logged_in',
                    roomPassword: loginInfo.auth.password,
                    share: () => socket.share(),
                };
            },
            getStream: async () => {
                if (!media) {
                    console.warn('No stream to share');
                    return;
                }
                const getThumbnail = new Promise<string>((resolve) => {
                    localVideo!.requestVideoFrameCallback(() => {
                        const frame = captureVideoFrame(localVideo!);
                        resolve(frame);
                    });
                });
                return {
                    media,
                    thumbnail: await getThumbnail,
                };
            },
            updateParticipants: (updatedParticipants: Record<string, SocketParticipant>) => {
                participants = updatedParticipants;
            },
        });
    }

    async function init(roomPassword: string) {
        const loginInfo: LoginOptions = {
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

        loginState = { type: 'joining' };
        await createSocket(loginInfo);
    }

    $effect(() => {
        const roomPassword = $config.channels[channel.ref.channel_id]?.password;
        console.log(channel.ref.channel_id, roomPassword);
        if (roomPassword) {
            init(roomPassword);
        } else {
            loginState = { type: 'logged_out' };
        }
    });
</script>

<div class="session">
    <video class="local-video" playsinline autoplay muted bind:this={localVideo}></video>
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
                {@const { stream } = participant}
                <li>
                    {participant.name}
                    <div class="video">
                        {#if stream}
                            {#if stream.type === 'playing'}
                                {#key stream}
                                    {@const load = (node: HTMLVideoElement) => {
                                        node.srcObject = stream.media;
                                    }}
                                    <div>
                                        <button onclick={stream.close}>Close</button>
                                    </div>
                                    <video playsinline autoplay muted use:load></video>
                                {/key}
                            {:else}
                                <button onclick={stream.request}>Request Video</button>
                                <img src={stream.info.thumbnail} alt="Thumbnail" />
                            {/if}
                        {/if}
                    </div>
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

    .local-video {
        width: 10rem;
        height: 10rem;
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
