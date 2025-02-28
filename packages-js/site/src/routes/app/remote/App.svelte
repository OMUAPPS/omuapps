<script lang="ts">
    import { Omu } from '@omujs/omu';
    import { I18N_GET_LOCALES_PERMISSION_ID } from '@omujs/omu/extension/i18n/i18n-extension.js';
    import { type RequestRemoteAppResponse } from '@omujs/omu/extension/server/server-extension.js';
    import { Button } from '@omujs/ui';
    import QrCode from 'qrious';
    import { ORIGIN } from '../origin.js';
    import { REMOTE_APP } from './app.js';

    export let omu: Omu;

    let state: {
        type: 'idle',
    } | {
        type: 'requesting',
    } | {
        type: 'denied',
    } | {
        type: 'generated',
        qr: InstanceType<typeof QrCode>,
    } = {
        type: 'idle',
    };
    let result: RequestRemoteAppResponse | null = null;

    async function test() {
        state = {
            type: 'requesting',
        };
        result = await omu.server.requestRemoteApp({
            app: REMOTE_APP,
            permissions: [
                I18N_GET_LOCALES_PERMISSION_ID,
            ],
        });
        if (result.type === 'error') {
            state = {
                type: 'denied',
            };
            return;
        }
        state = {
            type: 'generated',
            qr: new QrCode({
                value: `${ORIGIN}/app/remote/session/?token=${result.token}&lan=${result.lan_ip}`,
                size: 256,
            }),
        };
    }
</script>

<main>
    <Button onclick={test} primary>
        Request Remote App
    </Button>
    {#if state.type === 'generated'}
        <img src={state.qr.toDataURL()} alt="QR Code" />
    {/if}
    {#if state.type === 'denied'}
        <p>Permission denied</p>
    {/if}
</main>

