<script lang="ts">
    import AssetButton from '$lib/components/AssetButton.svelte';
    import type { OBSPlugin } from '@omujs/obs';
    import { Omu } from '@omujs/omu';
    import { Button } from '@omujs/ui';
    import ConnectScreen from './_components/ConnectScreen.svelte';
    import Gallery from './_components/Gallery.svelte';
    import VisualSettings from './_components/VisualSettings.svelte';
    import type { RemoteApp } from './remote-app.js';

    export let remote: RemoteApp;
    export let omu: Omu;
    export let obs: OBSPlugin;
    const { resources, config } = remote;

    let screen: 'connect' | null = null;

    let showDebugMenu = false;
</script>

<main>
    <div class="menu omu-scroll">
        <h2>
            接続
            <i class="ti ti-qrcode"></i>
        </h2>
        <section>
            <Button onclick={() => {screen = 'connect'}} primary>
                接続する
                <i class="ti ti-login-2"></i>
            </Button>
        </section>
        <h2>
            見た目の設定
        </h2>
        <section>
            <VisualSettings {remote} />
        </section>

        <h2>
            デバッグ
            <i class="ti ti-settings"></i>
        </h2>
        <section>
            <Button onclick={() => {
                showDebugMenu = !showDebugMenu;
            }}>
                Toggle Debug Menu
            </Button>
            {#if showDebugMenu}
                <pre>
            {JSON.stringify($resources, null, 2)}
                </pre>
                <pre>
            {JSON.stringify($config, null, 2)}
                </pre>
            {/if}
        </section>
        <h2 class="asset-button">
            配信に追加
            <i class="ti ti-arrow-bar-to-down"></i>
        </h2>
        <AssetButton {omu} {obs} dimensions={{width: '50:%', height: '50:%'}} />
    </div>
    <div class="gallery omu-scroll">
        <Gallery {omu} {remote} />
    </div>
    {#if screen === 'connect'}
        <div class="screen">
            <ConnectScreen {omu} cancel={() => {screen = null}} />
        </div>
    {/if}
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        color: var(--color-1);
    }

    .menu {
        padding: 1rem;
        width: 24rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .screen {
        position: absolute;
        inset: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        background: color-mix(in srgb, var(--color-bg-1) 90%, transparent 0%);
    }

    h2 {
        margin-top: 0.5rem;
    }

    section {
        display: flex;
        align-items: flex-start;
        flex-direction: column;
        gap: 1rem;
        background: var(--color-bg-2);
        padding: 1rem;
    }

    .gallery {
        flex: 1;
    }

    .asset-button {
        margin-top: auto;
    }

    pre {
        background: var(--color-bg-2);
        padding: 1rem;
        white-space: pre-wrap;
        overflow: auto;
    }
</style>
