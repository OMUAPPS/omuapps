<script lang="ts">
    import AssetButton from '$lib/components/AssetButton.svelte';
    import type { OBSPlugin } from '@omujs/obs';
    import { Omu } from '@omujs/omu';
    import { ASSET_DELETE_PERMISSION_ID, ASSET_DOWNLOAD_PERMISSION_ID, ASSET_UPLOAD_PERMISSION_ID } from '@omujs/omu/extension/asset/asset-extension.js';
    import { I18N_GET_LOCALES_PERMISSION_ID } from '@omujs/omu/extension/i18n/i18n-extension.js';
    import { REGISTRY_PERMISSION_ID } from '@omujs/omu/extension/registry/registry-extension.js';
    import { type RequestRemoteAppResponse } from '@omujs/omu/extension/server/server-extension.js';
    import { Button, FileDrop } from '@omujs/ui';
    import QrCode from 'qrious';
    import { ORIGIN } from '../origin.js';
    import { REMOTE_APP } from './app.js';
    import type { RemoteApp } from './remote-app.js';

    export let remote: RemoteApp;
    export let omu: Omu;
    export let obs: OBSPlugin;
    const { resources, config } = remote;

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
                ASSET_UPLOAD_PERMISSION_ID,
                ASSET_DOWNLOAD_PERMISSION_ID,
                ASSET_DELETE_PERMISSION_ID,
                REGISTRY_PERMISSION_ID,
            ],
        });
        if (result.type === 'error') {
            state = {
                type: 'denied',
            };
            return;
        }
        const { token, lan_ip } = result;
        console.log(token, lan_ip);
        state = {
            type: 'generated',
            qr: new QrCode({
                value: `${ORIGIN}/app/remote/session/?token=${token}&lan=${lan_ip}`,
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
    <AssetButton {omu} {obs} dimensions={{width: '50:%', height: '50:%'}} />
    <h2>Resources</h2>
    <ul>
        {#each Object.entries($resources.resources) as [id, resource] (id)}
            <li>
                <button on:click={() => {
                    remote.deleteResource(id);
                }}>
                    delete
                </button>
                <button on:click={() => {
                    $config.show = {
                        type: 'image',
                        asset: resource.asset,
                    }
                }}>
                    <p>{resource.filename ?? id}</p>
                    <img class="asset" src={omu.assets.url(resource.asset)} alt="">
                </button>
            </li>
        {/each}
    </ul>
    <FileDrop handle={async (files) => {
        const file = files[0];
        remote.upload(file);
    }}>Drop Image Here
    </FileDrop>
    <pre>
        {JSON.stringify($resources, null, 2)}
    </pre>
    <pre>
        {JSON.stringify($config, null, 2)}
    </pre>
</main>

<style lang="scss">
    main {
        display: grid;
        gap: 1rem;
        padding: 1rem;
    }

    .asset {
        width: 100%;
        height: auto;
    }

    ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fill, minmax(256px, 1fr));
    }

    li {
        border: 1px solid #ccc;
        overflow: hidden;
    }

    p {
        padding: 0.5rem;
        margin: 0;
        background: #f0f0f0;
    }
</style>
