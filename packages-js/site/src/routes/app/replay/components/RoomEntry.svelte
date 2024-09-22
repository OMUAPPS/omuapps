<script lang="ts">
    import type { Room } from '@omujs/chat/models/room.js';
    import { Tooltip } from '@omujs/ui';
    import { playVideo } from '../stores.js';

    export let entry: Room;
    export let selected: boolean = false;

    function play() {
        if (!entry.metadata?.url) return;
        const url = new URL(entry.metadata.url);
        const videoId = url.searchParams.get('v');
        if (!videoId) return;
        $playVideo(videoId);
    }
</script>

<button class="room-entry" class:selected on:click={() => play()}>
    <div class="thumbnail-container">
        <Tooltip>
            <p class="tooltip">
                <img src={entry.metadata?.thumbnail} class="thumbnail-preview" alt="" />
            </p>
        </Tooltip>
        <img src={entry.metadata?.thumbnail} class="thumbnail" alt="" />
    </div>
    <div class="info">
        <div class="title">
            <Tooltip>
                <p class="tooltip">
                    {entry.metadata?.title}
                </p>
            </Tooltip>
            {entry.metadata?.title}
        </div>
        <div class="description">
            <Tooltip>
                <p class="tooltip">{entry.metadata?.description}</p>
            </Tooltip>
            {entry.metadata?.description}
        </div>
    </div>
</button>

<style lang="scss">
    .room-entry {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        padding: 0.5rem 0.5rem;
        margin-right: 0.5rem;
        cursor: pointer;
        border: none;
        width: 100%;
        background: var(--color-bg-2);
        border-bottom: 2px solid var(--color-bg-1);
        color: var(--color-1);
    }

    .room-entry.selected,
    .room-entry:hover {
        background: var(--color-bg-1);
        outline: 1px solid var(--color-1);
        outline-offset: -2px;
    }

    .thumbnail-container {
        $height: 3.2rem;
        height: $height;
        width: calc($height * 16 / 9);
        margin-left: 0.25rem;
    }

    .thumbnail {
        width: 100%;
        height: 100%;
        border-radius: 3px;
        object-fit: cover;
    }

    .thumbnail-preview {
        height: 10rem;
        object-fit: cover;
    }

    .info {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: flex-start;
        width: 0;
        height: 100%;
        gap: 0.25rem;
    }

    .title {
        font-size: 0.9rem;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        width: 100%;
    }

    .description {
        font-size: 0.65rem;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        width: 100%;
    }

    .tooltip {
        padding: 0.5rem;
        font-size: 0.7rem;
        max-width: 20rem;
        white-space: normal;
    }
</style>
