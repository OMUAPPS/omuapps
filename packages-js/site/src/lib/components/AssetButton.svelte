<script lang="ts">
    import { page } from '$app/stores';
    import type { OBSPlugin } from '@omujs/obs';
    import type { CreateBrowserRequest } from '@omujs/obs/types.js';
    import type { Omu } from '@omujs/omu';
    import { DragLink, Spinner, Tooltip } from '@omujs/ui';

    export let omu: Omu | null = null;
    export let obs: OBSPlugin | null = null;
    export let dimensions: { width: CreateBrowserRequest['width']; height: CreateBrowserRequest['height'] } | undefined = undefined;

    async function create() {
        if (!obs) {
            throw new Error('OBSPlugin is not initialized');
        }
        const name = omu?.app.metadata?.name ? omu.i18n.translate(omu.app.metadata?.name) : 'Asset';
        const url = getURL().toString();
        await obs.browserAdd({
            name: name,
            url: url,
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
    if (obs) {
        obs.on('connected', () => (obsConnected = true));
        obs.on('disconnected', () => (obsConnected = false));
        obsConnected = obs.isConnected();
    }

    function getURL() {
        const url = new URL($page.url);
        url.pathname = `${url.pathname}asset`;
        url.searchParams.set('assetId', Date.now().toString());
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
        <DragLink href={getURL}>
            <h3 slot="preview" class="preview">
                <i class="ti ti-download"></i>
                これをOBSにドロップ
            </h3>
            <div class="drag obs">
                <Tooltip>ドラッグ&ドロップで追加</Tooltip>
                <i class="ti ti-drag-drop"></i>
            </div>
        </DragLink>
    </div>
{:else}
    <DragLink href={getURL}>
        <h3 slot="preview" class="preview">
            <i class="ti ti-download"></i>
            これを配信ソフトに追加
        </h3>
        <div class="drag">
            <i class="ti ti-drag-drop"></i>
            ここをドラッグ&ドロップ
        </div>
    </DragLink>
{/if}

<style lang="scss">
    .preview {
        background: var(--color-1);
        color: var(--color-bg-2);
        outline: 2px solid var(--color-bg-2);
        outline-offset: -1px;
        padding: 0.5rem 1rem;
        font-size: 1rem;
        border-radius: 2px;
    }

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
            // background: var(--color-bg-1);
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

    .drag {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-width: 3rem;
        height: 100%;
        color: var(--color-1);
        background: var(--color-bg-2);
        outline: 2px solid var(--color-1);
        outline-offset: -2px;
        font-weight: bold;
        padding: 0.75rem 2rem;
        gap: 5px;
        cursor: grab;

        & > i {
            font-size: 20px;
        }

        &.obs {
            padding: 0.75rem 1rem;
        }

        &:hover {
            transform: translate(2px, 0);
            outline: 2px solid var(--color-1);
            box-shadow: -2px 3px 0 0px var(--color-2);
            transition: 0.0621s;
        }
    }
</style>
