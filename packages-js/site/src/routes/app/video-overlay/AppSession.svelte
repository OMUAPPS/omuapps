<script lang="ts">
    import { ARC4 } from '$lib/random';
    import { AssetButton, Button, omu, Spinner, Tooltip } from '@omujs/ui';
    import { onDestroy } from 'svelte';
    import type { RPCSession, RPCVoiceStates, SelectedVoiceChannel } from '../discord-overlay/discord/discord';
    import type { Message } from '../discord-overlay/discord/type';
    import ParticipantEntry from './_components/ParticipantEntry.svelte';
    import { VIDEO_OVERLAY_APP, VIDEO_OVERLAY_ASSET_APP } from './app';
    import { Socket, type SocketParticipant } from './rtc/connection';
    import { type ErrorKind, type LoginOptions } from './rtc/signaling';
    import { captureVideoFrame } from './rtc/video';
    import { shorten, unshorten } from './shortener';
    import type { VideoOverlayApp } from './video-overlay-app';

    interface Props {
        session: RPCSession;
        channel: SelectedVoiceChannel;
        voiceStates: RPCVoiceStates;
        overlayApp: VideoOverlayApp;
    }

    let { session, channel, voiceStates, overlayApp }: Props = $props();
    const { config, discord } = overlayApp;
    const { channelMessageSignal } = discord;

    let sockets: Record<string, SocketParticipant> = $state({});

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
        end: () => void;
    } | {
        type: 'failed';
        kind: ErrorKind;
    } = $state({ type: 'logging_in' });

    let media: MediaStream | undefined = $state();
    const random = ARC4.fromNumber(Date.now());
    const loginPassword = $config.password ??= random.getString(16);
    let localVideo: HTMLVideoElement | undefined = $state();
    let loginId = $derived(VIDEO_OVERLAY_APP.id.join(session.user.id, 'user').key());
    let roomId = $derived(VIDEO_OVERLAY_APP.id.join(channel.guild.id, channel.channel.id).key());

    async function createSocket(loginInfo: LoginOptions) {
        const socket = await Socket.new($omu, loginInfo, {
            share: async () => {
                media = await navigator.mediaDevices.getDisplayMedia({
                    audio: true,
                    video: true,
                });
                localVideo!.srcObject = media;
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
            loggedIn: () => {
                loginState = {
                    type: 'logged_in',
                    roomPassword: loginInfo.auth.password,
                    share: () => socket.share(),
                    end: () => socket.endShare(),
                };
            },
            handleError: (kind) => {
                loginState = {
                    type: 'failed',
                    kind,
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
                sockets = updatedParticipants;
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
            $config.channels[channel.ref.channel_id] = {
                password: code,
            };
        }
    }));
</script>

<video class="local-video" playsinline autoplay muted hidden bind:this={localVideo}></video>
<main>
    {#if loginState.type === 'logging_in'}
        <h2>ログイン中<Spinner /></h2>
    {:else if loginState.type === 'logged_out'}
        <div class="modal">
            <h1>パスワードを設定</h1>
            <p>以下からコピーして参加している<b>ボイスチャットのチャット</b>に送信してください</p>
            <Button primary onclick={() => {
                const shortened = shorten(random.getString(16));
                console.log('copy pass', shortened);
                const text = `# ビデオオーバーレイ認証メッセージ${shortened}\n ⚠️警告: このメッセージを見れる人はボイスチャットに参加せずに配信を見ることができます。安全なボイスチャットで使用することを推奨します。`;

                navigator.clipboard.writeText(text);
            }}>
                コピー
                <i class="ti ti-copy"></i>
            </Button>
        </div>
    {:else if loginState.type === 'logged_in'}
        {@const state = loginState}
        <div class="participants">
            {#each Object.entries(voiceStates.states) as [id, state] (id)}
                {@const socket = Object.values(sockets).find(((socket) => socket.userId === id))}
                <ParticipantEntry user={state.user} {socket} />
            {/each}
            <div class="asset">
                <AssetButton asset={VIDEO_OVERLAY_ASSET_APP} single />
            </div>
        </div>
        <div class="control">
            <h2>{session.user.global_name}</h2>
            {#if media}
                <Button primary onclick={loginState.share}>
                    変更
                </Button>
                <Button primary onclick={loginState.end}>
                    解除
                </Button>
            {:else}
                <Button primary onclick={loginState.share}>
                    画面を共有
                    <i class="ti ti-shareplay"></i>
                </Button>
            {/if}
            <Button primary onclick={() => {
                const shortened = shorten(state.roomPassword);
                console.log('copy pass', shortened);
                const text = `# ビデオオーバーレイ認証メッセージ${shortened}\n ⚠️警告: このメッセージを見れる人はボイスチャットに参加せずに配信を見ることができます。安全なボイスチャットで使用することを推奨します。`;

                navigator.clipboard.writeText(text);
            }}>
                <Tooltip>
                    参加している<b>ボイスチャットのチャット</b>に送信してください
                </Tooltip>
                招待
                <i class="ti ti-users-plus"></i>
            </Button>
        </div>
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
                const roomPassword = $config.channels[channel.ref.channel_id]?.password;
                console.log(channel.ref.channel_id, roomPassword);
                if (roomPassword) {
                    init(roomPassword);
                } else {
                    loginState = { type: 'logged_out' };
                }
            }} primary>
                再試行
            </Button>
        {/if}
    {:else if loginState.type === 'joining'}
        <h2>参加中<Spinner /></h2>
    {/if}
</main>

<style lang="scss">
    h1 {
        color: var(--color-1);
    }

    .modal {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        align-items: center;

        b {
            color: var(--color-1);
            border-bottom: 1px solid var(--color-1);
        }
    }

    main {
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        inset: 0;
    }

    .participants {
        position: relative;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
        flex: 1;
        padding: 1rem;
    }

    .asset {
        position: absolute;
        right: 0;
        bottom: 0;
        margin: 1rem;
    }

    .control {
        display: flex;
        align-items: baseline;
        justify-content: center;
        gap: 1rem;
        background: var(--color-bg-2);
        padding: 1rem;
        margin: 1rem;
        margin-top: 0;
    }

    .local-video {
        width: 100%;
        height: 100%;
    }
</style>
