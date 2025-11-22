<script lang="ts">
    import { run } from 'svelte/legacy';

    import { OmuPermissions, type Omu } from '@omujs/omu';
    import { } from '@omujs/omu/api/asset';
    import type { RequestRemoteAppResponse } from '@omujs/omu/api/session';
    import { Button } from '@omujs/ui';
    import { DEV } from 'esm-env';
    import QrCode from 'qrious';
    import { ORIGIN } from '../../origin.js';
    import { REMOTE_APP } from '../app.js';

    interface Props {
        omu: Omu;
        cancel: () => void;
        connected: boolean;
    }

    let { omu, cancel, connected }: Props = $props();

    let connectState:
        | {
            type: 'idle';
        }
        | {
            type: 'requesting';
        }
        | {
            type: 'denied';
        }
        | {
            type: 'generated';
            qr: InstanceType<typeof QrCode>;
        }
        | {
            type: 'connected';
        } = $state({
            type: 'idle',
        });
    let result: RequestRemoteAppResponse | null = null;

    async function generateToken() {
        connectState = {
            type: 'requesting',
        };
        result = await omu.sessions.requestRemoteApp({
            app: REMOTE_APP,
            permissions: [
                OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
                OmuPermissions.ASSET_PERMISSION_ID,
                OmuPermissions.REGISTRY_PERMISSION_ID,
            ],
        });
        if (result.type === 'error') {
            connectState = {
                type: 'denied',
            };
            return;
        }
        const { token, lan_ip } = result;
        console.log(token, lan_ip);
        const url = `http://${lan_ip}:26423/frame?url=${encodeURIComponent(`${DEV ? `http://${lan_ip}:5173` : ORIGIN}/app/remote/session/?token=${token}&lan=${lan_ip}`)}`;
        console.log(url);
        connectState = {
            type: 'generated',
            qr: new QrCode({
                value: url,
                size: 256,
                backgroundAlpha: 0,
                foreground: '#000',
            }),
        };
    }

    run(() => {
        if (connected) {
            connectState = {
                type: 'connected',
            };
            setTimeout(() => {
                cancel();
            }, 3000);
        }
    });

    generateToken();
</script>

<div class="screen">
    {#if connectState.type === 'requesting'}
        <h2>
            通信中
            <i class="ti ti-loader"></i>
        </h2>
        <small> デバイスとの接続をリクエストしています </small>
    {:else if connectState.type === 'generated'}
        <h2>
            QRコードをスキャンしてください
            <i class="ti ti-scan"></i>
        </h2>
        <small> 接続したいデバイスでQRコードを読み取ってください </small>
        <img src={connectState.qr.toDataURL()} alt="QR Code" />
        <div class="actions">
            <Button primary onclick={cancel}>
                完了
                <i class="ti ti-check"></i>
            </Button>
        </div>
    {:else if connectState.type === 'connected'}
        <h2>
            接続されました
            <i class="ti ti-check"></i>
        </h2>
        <small> デバイスとの接続が完了しました </small>
        <div class="actions">
            <Button primary onclick={cancel}>
                完了
                <i class="ti ti-check"></i>
            </Button>
        </div>
    {:else if connectState.type === 'denied'}
        <h2>
            キャンセルされました
            <i class="ti ti-alert-hexagon"></i>
        </h2>
        <small> 権限の要求が拒否されました。もう一度お試しください。 </small>
        <div class="actions">
            <Button primary onclick={generateToken}>
                再試行
                <i class="ti ti-reload"></i>
            </Button>
            <Button onclick={cancel}>
                キャンセル
                <i class="ti ti-x"></i>
            </Button>
        </div>
    {/if}
</div>

<style lang="scss">
    .screen {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: 40rem;
        height: 24rem;
        background: var(--color-bg-2);
        outline: 1px solid var(--color-outline);
        border-radius: 2px;
    }

    h2 {
        font-size: 1.25rem;
        border-bottom: 1px solid var(--color-1);
        padding-bottom: 0.5rem;
        color: var(--color-1);
        margin-bottom: 1rem;
    }

    small {
        font-size: 0.821rem;
        color: var(--color-text);
        margin-bottom: 1rem;
    }

    .actions {
        display: flex;
        gap: 0.5rem;
    }

    img {
        width: 10rem;
        height: 10rem;
        image-rendering: pixelated;
        margin-bottom: 1rem;
    }
</style>
