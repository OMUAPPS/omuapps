<script lang="ts">
    import type { CreateBrowserRequest } from '@omujs/obs/types.js';
    import type { App, SessionParam } from '@omujs/omu';
    import { BrowserTokenProvider, OmuPermissions, type IntoId } from '@omujs/omu';
    import { obs, omu, Spinner, Tooltip } from '@omujs/ui';

    export let asset: App;
    export let single = false;
    export let dimensions: { width: CreateBrowserRequest['width']; height: CreateBrowserRequest['height'] } | undefined = undefined;
    export let permissions: IntoId[] = [];

    async function create() {
        const name = $omu.app.metadata?.name ? $omu.i18n.translate($omu.app.metadata?.name) : 'Asset';
        const url = await generateURL();
        await $obs.browserAdd({
            name: name,
            url: url.toString(),
            blend_properties: {
                blending_method: 'SRGB_OFF',
                blending_mode: 'NORMAL',
            },
            ...dimensions,
        });
        await new Promise((resolve) => setTimeout(resolve, 500));
        creating = null;
    }

    let obsConnected = false;
    $obs.on('connected', () => (obsConnected = true));
    $obs.on('disconnected', () => (obsConnected = false));
    obsConnected = $obs.isConnected();

    async function generateURL() {
        const url = new URL(asset.url ?? location.href);
        const timestamp = Date.now().toString(36);
        let app = asset;
        if (!single) {
            url.searchParams.set('id', timestamp);
            app = app.join(timestamp);
        }
        const result = await $omu.sessions.generateToken({
            app,
            permissions: [
                OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
                OmuPermissions.REGISTRY_PERMISSION_ID,
                OmuPermissions.TABLE_PERMISSION_ID,
                ...permissions,
            ],
        });
        if (result.type === 'error') {
            throw new Error(result.message);
        }
        const { token } = result;
        const tokenJson: SessionParam = {
            token,
            address: $omu.address,
        };
        url.searchParams.set(BrowserTokenProvider.TOKEN_PARAM_KEY, JSON.stringify(tokenJson));
        return url;
    }

    let creating: Promise<void> | null = null;
</script>

{#if obsConnected}
    <div class="container">
        <button on:click={() => (creating = create())} class="add-button" disabled={creating !== null}>
            {#if creating}
                作成中...
                <Spinner />
            {:else}
                <Tooltip>クリックで追加</Tooltip>
                OBSの現在のシーンに追加
                <i class="ti ti-download"></i>
            {/if}
        </button>
    </div>
{:else}
    <div class="container">
        <button class="add-button" disabled title="OBSに接続されていません">
            <Tooltip>
                すでに起動されていても認識されない場合は再起動をお試しください
            </Tooltip>
            OBSに接続されていません
            <i class="ti ti-alert-circle"></i>
        </button>
    </div>
{/if}

<style lang="scss">
    .container {
        position: relative;
        display: flex;
        gap: 0.5rem;
    }

    button {
        border: 2px solid var(--color-1);
    }

    .add-button {
        flex: 1;
        max-width: 20rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.75rem 1.25rem;
        background: var(--color-bg-2);
        color: var(--color-1);
        font-weight: bold;
        font-size: 0.9rem;
        cursor: pointer;

        & > i {
            font-size: 14px;
        }

        &:focus-visible,
        &:hover {
            outline: none;
            color: var(--color-1);
            transition: 0.0621s;
            box-shadow: 0 0.25rem 0 0px var(--color-2);
            transform: translateY(-1px);
        }

        &:disabled {
            background: var(--color-bg-1);
            color: var(--color-1);
            cursor: not-allowed;
        }
        &:active {
            transform: translateY(2px);
            background: var(--color-1);
            color: var(--color-bg-2);
            box-shadow: none;
            transition: 0s;
        }
    }
</style>
