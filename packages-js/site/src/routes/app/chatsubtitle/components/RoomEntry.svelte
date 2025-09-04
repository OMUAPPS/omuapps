<script lang="ts">
    import type { Room } from "@omujs/chat/models";
    import { createSubtitle } from "../stores.js";

    export let entry: Room;
    export let selected: boolean = false;

    function create() {
        $createSubtitle(entry);
    }
</script>

<button class="room-entry" class:selected on:click={create}>
    <img src={entry.metadata?.thumbnail} class="thumbnail" alt="" />
    <div class="info">
        <div class="title">{entry.metadata?.title}</div>
        <div class="description">{entry.metadata?.description}</div>
    </div>
</button>

<style lang="scss">
    .room-entry {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        padding: 0.5rem;
        margin-right: 0.5rem;
        cursor: pointer;
        border: none;
        width: 100%;
        background: var(--color-bg-1);
    }

    .room-entry.selected {
        background: var(--color-bg-2);
    }

    .thumbnail {
        width: 4rem;
        height: 3rem;
        border-radius: 0.5rem;
        object-fit: cover;
    }

    .info {
        flex: 1;
        display: flex;
        flex-direction: column;
        width: 0;
    }

    .title {
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        line-clamp: 1;
        -webkit-box-orient: vertical;
    }

    .description {
        font-size: 0.8rem;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        line-clamp: 1;
        -webkit-box-orient: vertical;
    }
</style>
