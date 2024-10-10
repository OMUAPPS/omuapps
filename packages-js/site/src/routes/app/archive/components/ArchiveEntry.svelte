<script lang="ts">
    import { ButtonMini, Spinner, Tooltip } from '@omujs/ui';
    import type { Archive, ArchiveStatus } from '../archive.js';

    export let entry: Archive;
    export let selected: boolean = false;

    const STATUS_COLORS = {
        completed: 'var(--color-1)',
        failed: '#d04060',
        pending: '#f0a010',
        processing: '#50a0a0',
    } satisfies Record<ArchiveStatus, string>;

    const fileUrl = `file://${entry.path}`;

    function dragStart(event: DragEvent) {
        event.dataTransfer?.setData('text', fileUrl);
    }
</script>

<div draggable="true" on:dragstart={dragStart} role="form">
    <article class:selected>
        <div>
            <Tooltip>
                <img src={entry.thumbnail} class="thumbnail-tooltip" alt="" />
            </Tooltip>
            <img src={entry.thumbnail} class="thumbnail" alt="" />
        </div>
        <div class="info">
            <span class="title">
                <Tooltip>
                    {entry.title}
                </Tooltip>
                {entry.title}
            </span>
            <span class="description">
                <Tooltip>
                    <span style:white-space="pre-wrap">
                        {entry.description}
                    </span>
                </Tooltip>
                {entry.description}
            </span>
        </div>
        <div class="buttons">
            {#if entry.status === 'completed'}
                <ButtonMini>
                    <i class="ti ti-player-play" />
                </ButtonMini>
                <ButtonMini>
                    <i class="ti ti-folder-open" />
                </ButtonMini>
            {/if}
            <ButtonMini on:click={() => window.open(entry.url)}>
                <Tooltip>配信を見る</Tooltip>
                <i class="ti ti-external-link" />
            </ButtonMini>
            <div>
                <Tooltip>
                    {entry.status}
                </Tooltip>
                {#if entry.status === 'processing'}
                    <Spinner />
                {:else}
                    <div class="status" style:background={STATUS_COLORS[entry.status]}></div>
                {/if}
            </div>
        </div>
    </article>
</div>

<style lang="scss">
    article {
        display: flex;
        gap: 1rem;
        height: 4rem;
        background: var(--color-bg-2);
        color: var(--color-1);
    }

    .thumbnail {
        width: calc(4rem * 16 / 9);
        height: 4rem;
        object-fit: cover;
        padding: 1px 2px;
    }

    .thumbnail-tooltip {
        width: 30rem;
    }

    div {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        font-size: 0.9rem;
        font-weight: 600;
    }

    .info {
        flex: 1;
        display: flex;
        flex-direction: column;
        width: 0;
    }

    .title {
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .description {
        font-size: 0.65rem;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .buttons {
        display: flex;
        flex-direction: row;
        align-items: center;
        margin-left: auto;
        margin-right: 1rem;
    }

    .status {
        margin-left: 0.5rem;
        width: 12px;
        height: 12px;
        align-self: center;
        border-radius: 50%;
        outline: 2px solid color-mix(in srgb, #000 10%, transparent 0%);
        outline-offset: -2px;
    }

    .selected {
        background: var(--color-bg-1);
        outline: 1px solid var(--color-1);
        outline-offset: -4px;
    }
</style>
