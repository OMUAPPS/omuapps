<script lang="ts">
    import { omu } from '$lib/client.js';
    import { Spinner, Tooltip } from '@omujs/ui';
    import { relaunch } from '@tauri-apps/api/process';
    import type { UpdateManifest } from '@tauri-apps/api/updater';
    import { onMount } from 'svelte';

    let newVersion: UpdateManifest | null = null;
    let updating = false;

    async function checkNewVersion() {
        const { checkUpdate } = await import('@tauri-apps/api/updater');
        const update = await checkUpdate();
        const { manifest, shouldUpdate } = update;

        if (shouldUpdate && manifest) {
            newVersion = manifest;
        }
    }

    async function update() {
        if (!newVersion) {
            throw new Error('newVersion is null');
        }
        if (updating) {
            throw new Error('Already updating');
        }
        updating = true;
        const { installUpdate } = await import('@tauri-apps/api/updater');
        try {
            await omu.server.shutdown();
        } catch (e) {
            console.error(e);
        }
        await installUpdate();
        await relaunch();
    }
    
    onMount(() => checkNewVersion());
</script>

{#if newVersion}
    {@const date = new Date(newVersion.date)}
    <div class="new-version">
        <small>
            新しいバージョンがあります。起動しない場合は最新バージョンにアップデートしてください。
        </small>
        <button on:click={update} class="update" disabled={updating}>
            <Tooltip>
                <p><b>{newVersion.version}</b> にアップデート</p>
                <small>
                    ({date.toLocaleDateString()})
                    {newVersion.body}
                </small>
            </Tooltip>
            {#if updating}
                更新中
                <Spinner />
            {:else}
                アップデート
                <i class="ti ti-arrow-right" />
            {/if}
        </button>
    </div>
{/if}

<style lang="scss">
    .update {
        padding: 0.5rem 1rem;
        border: none;
        background: var(--color-bg-2);
        outline: 1px solid var(--color-1);
        outline-offset: -1px;
        color: var(--color-1);
        font-size: 0.8rem;
        font-weight: bold;
        border-radius: 2px;

        > i {
            margin-left: 0.1rem;
        }

        &:hover {
            background: var(--color-1);
            color: var(--color-bg-1);
        }

        &:disabled {
            background: var(--color-bg-1);
            outline: 1px solid var(--color-text);
            color: var(--color-text);
        }
    }

    .new-version {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        align-items: center;
        font-size: 0.9rem;
        color: var(--color-text);
    }
</style>
