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

    let screen: 'connect' | null = null;

    const { connected } = remote;

    let showSettings = false;
</script>

<main>
    <div class="menu omu-scroll">
        <h2>
            接続
            <i class="ti ti-qrcode"></i>
        </h2>
        <section>
            <span>
                <Button onclick={() => {screen = 'connect'}} primary>
                    接続する
                    <i class="ti ti-login-2"></i>
                </Button>
                {#if $connected}
                    <small>
                        接続済み
                        <i class="ti ti-wifi"></i>
                    </small>
                {:else}
                    <small>
                        接続されていません
                        <i class="ti ti-wifi-off"></i>
                    </small>
                {/if}
            </span>
        </section>
        <h2>
            <button class="tab" on:click={() => {showSettings = !showSettings}}>
                表示の設定
                <i class="ti ti-settings"></i>
                {#if showSettings}
                    <i class="ti ti-chevron-up"></i>
                {:else}
                    <i class="ti ti-chevron-down"></i>
                {/if}
            </button>
        </h2>
        {#if showSettings}
            <section>
                <VisualSettings {remote} />
            </section>
        {/if}
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
            <ConnectScreen {omu} cancel={() => {screen = null}} connected={$connected} />
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
        white-space: nowrap;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        overflow-x: hidden;
    }

    .tab {
        width: 100%;
        display: flex;
        align-items: baseline;
        gap: 0.25rem;
        background: none;
        border: 0;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        color: var(--color-1);

        > .ti-chevron-down,
        > .ti-chevron-up {
            margin-left: auto;
        }

        &:hover {
            margin-left: 1px;
            transition: margin 0.0621s;
        }

        &:active {
            margin-left: -1px;
            transition: margin 0.0621s;
        }
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

    span {
        display: flex;
        align-items: baseline;
        gap: 1rem;
    }

    small {
        color: var(--color-text);
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
        border-left: 1px solid var(--color-outline);
    }

    .asset-button {
        margin-top: auto;
    }
</style>
