<script lang="ts">
    import { page } from '$app/stores';
    import type { OBSPlugin } from '@omujs/obs';
    import type { Omu } from '@omujs/omu';
    import { DragLink, Tooltip } from '@omujs/ui';

    export let omu: Omu | null = null;
    export let obs: OBSPlugin | null = null;
    export let dimensions: { width: number; height: number } = { width: 1920, height: 1080 };

    async function getAvailableName(name: string) {
        if (!obs) {
            throw new Error('OBSPlugin is not initialized');
        }
        const sources = await obs.sourceList();
        const names = sources.map((source) => source.name);
        if (!names.includes(name)) return name;
        let i = 1;
        let newName = name;
        while (names.includes(newName)) {
            newName = `${name} (${i})`;
            i++;
        }
        return newName;
    }

    async function create() {
        if (!obs) {
            throw new Error('OBSPlugin is not initialized');
        }
        const name = await getAvailableName(omu?.app.metadata?.name ? omu.i18n.translate(omu.app.metadata?.name) : 'Asset');
        const url = generateUrl().toString();
        await obs.sourceCreate({
            type: 'browser_source',
            name: name,
            data: {
                url,
                ...dimensions,
            },
            blend_properties: {
                blending_method: 'SRGB_OFF',
                blending_mode: 'NORMAL',
            },
        });
    }

    let obsConnected = false;
    if (obs) {
        obs.on('connected', () => (obsConnected = true));
        obs.on('disconnected', () => (obsConnected = false));
        obs.isConnected().then((connected) => (obsConnected = connected));
    }

    function generateUrl() {
        const url = new URL($page.url);
        url.pathname = `${url.pathname}asset`;
        url.searchParams.set('assetId', Date.now().toString());
        return url;
    }
</script>

{#if obsConnected}
    <div class="container">
        <button on:click={create} class="add-button">
            <Tooltip>クリックで追加</Tooltip>
            OBSの現在のシーンに追加
            <i class="ti ti-plus" />
        </button>
        <DragLink href={generateUrl}>
            <h3 slot="preview" class="preview">
                これをOBSにドロップ
                <i class="ti ti-upload" />
            </h3>
            <div class="drag">
                <Tooltip>ドラッグ&ドロップで追加</Tooltip>
                <i class="ti ti-drag-drop" />
            </div>
        </DragLink>
    </div>
{:else}
    <DragLink href={generateUrl}>
        <h3 slot="preview" class="preview">
            これをOBSにドロップ
            <i class="ti ti-upload" />
        </h3>
        <div class="drag">
            <i class="ti ti-drag-drop" />
            ここをOBSにドラッグ&ドロップ
        </div>
    </DragLink>
{/if}

<style lang="scss">
    .preview {
        padding: 10px 20px;
        background: var(--color-bg-2);
    }

    .container {
        display: flex;
        gap: 10px;
    }

    button {
        border: 2px solid var(--color-1);
    }

    .add-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        padding: 0.75rem 1rem;
        background: var(--color-bg-2);
        color: var(--color-1);
        font-weight: bold;
        font-size: 0.9rem;
        cursor: pointer;

        & > i {
            font-size: 14px;
        }

        &:hover {
            transition: 0.0621s;
        }
    }

    .drag {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        color: var(--color-1);
        background: var(--color-bg-2);
        outline: 2px solid var(--color-1);
        outline-offset: -2px;
        font-weight: bold;
        padding: 0.75rem;
        gap: 5px;
        cursor: grab;

        & > i {
            font-size: 20px;
        }

        &:hover {
            margin-left: 4px;
            outline: 2px solid var(--color-1);
            box-shadow: -4px 4px 0 2px var(--color-2);
            transition: 0.0621s;
        }
    }
</style>
