<script lang="ts">
    import { applyUpdate } from "$lib/tauri.js";
    import { Spinner, Tooltip } from "@omujs/ui";
    import type { Update } from "@tauri-apps/plugin-updater";
    import { onMount } from "svelte";

    let update: Update | null = null;
    let updating = false;

    async function checkNewVersion() {
        const { check } = await import("@tauri-apps/plugin-updater");
        update = await check();
    }

    async function doUpdate() {
        if (!update) {
            throw new Error("newVersion is null");
        }
        if (updating) {
            throw new Error("Already updating");
        }
        await applyUpdate(update, () => {});
    }

    onMount(() => checkNewVersion());
</script>

{#if update}
    {@const date = update.date && new Date(update.date)}
    <div class="new-version">
        <small>
            新しいバージョンがあります。起動しない場合は最新バージョンにアップデートしてください。
        </small>
        <button on:click={doUpdate} class="update" disabled={updating}>
            <Tooltip>
                <p><b>{update.version}</b> にアップデート</p>
                <small>
                    {#if date}
                        ({date.toLocaleDateString()})
                    {/if}
                    {update.body}
                </small>
            </Tooltip>
            {#if updating}
                更新中
                <Spinner />
            {:else}
                アップデート
                <i class="ti ti-arrow-right"></i>
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
