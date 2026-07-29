<script lang="ts">
    import { browser } from '$app/environment';
    import { Models } from '@omujs/chat';
    import type { NetworkStatus } from '@omujs/omu/network';
    import { Spinner, TableList } from '@omujs/ui';
    import { onDestroy } from 'svelte';
    import MessageEntry from '../_components/MessageEntry.svelte';
    import { ChatOverlayApp } from '../chat-app.js';
    import WindowResizer from './WindowResizer.svelte';

    let { omu, chat, config } = ChatOverlayApp.getInstance();

    let status: NetworkStatus = $state(omu.network.status);

    const unlistenStatus = omu.network.on('status', (value) => {
        status = value;
    });

    const MAX_ROOMS = 20;

    let onlineRoomIds = $state<Set<string>>(new Set());

    const updateOnlineRooms = (
        rooms: Map<string, Models.Room> | Models.Room[],
    ) => {
        const roomArray =
            rooms instanceof Map ? Array.from(rooms.values()) : rooms;
        onlineRoomIds = new Set(
            roomArray.filter((r) => r.connected).map((r) => r.id.key()),
        );
    };
    const unlistenRooms = chat.rooms.listen(updateOnlineRooms);
    const unlistenAuthors = chat.authors.listen();

    omu.onReady(async () => {
        const initialRooms = await chat.rooms.fetchItems({
            limit: MAX_ROOMS,
            backward: true,
        });

        updateOnlineRooms(Array.from(initialRooms.values()));
    });

    onDestroy(() => {
        unlistenRooms();
        unlistenAuthors();
        unlistenStatus();
    });

    let filter = $derived((_key: string, entry: Models.Message) => {
        if (entry.deleted) return false;
        if (!$config.chat.filter.onlyConnected) return true;
        return onlineRoomIds.has(entry.roomId.key());
    });

    let sort = (entry: Models.Message) => {
        return entry.createdAt.getTime();
    };
</script>

<main>
    <div class="control">
        <div class="drag" data-tauri-drag-region>
            <i class="ti ti-hand-stop"></i>
            <p>チャットを移動</p>
        </div>
        <button
            title="close"
            onclick={() => {
                close();
            }}
        >
            <i class="ti ti-x"></i>
        </button>
    </div>
    <div class="list">
        <TableList table={chat.messages} {filter} {sort} reverse={true}>
            {#snippet component({ entry })}
                <MessageEntry {entry} />
            {/snippet}
            {#snippet empty()}
                <p class="empty">
                    {#if onlineRoomIds.size === 0}
                        接続している配信がありません
                    {:else}
                        メッセージがありません
                    {/if}
                </p>
            {/snippet}
        </TableList>
    </div>
    <div class="overlay">
        {#if status.type === 'connecting'}
            <p>
                接続中
                <Spinner />
            </p>
        {:else if status.type === 'disconnected'}
            {@const { reason } = status}
            切断されました
            {#if reason}
                <code>
                    {reason.type}
                    {reason.message}
                </code>
            {/if}
        {/if}
    </div>
</main>
{#if browser}
    <WindowResizer />
{/if}

<style lang="scss">
    :global(body) {
        background: transparent !important;
        overscroll-behavior: none;
        touch-action: none;
    }

    main {
        background: rgba($color: #000000, $alpha: 0.65);
        color: #fff;
        outline: 1px solid rgba($color: #000000, $alpha: 0.25);
        outline-offset: -1px;
        inset: 2px;
        box-shadow: 0 0 0.25rem #4444;
        position: absolute;
        border-radius: 2rem;
        corner-shape: squircle;
        overflow: hidden;
        transition: background 0.1s;
        color: #eee;
        margin: 0.25rem;
        animation: fade 0.2s forwards;
    }

    .empty {
        text-align: center;
        font-size: 0.8rem;
        color: #aaa;
        margin-top: 50%;
    }

    main:hover {
        background: rgba($color: #000000, $alpha: 0.765);
    }

    @keyframes fade {
        0% {
            opacity: 0;
            scale: 0.95;
        }

        100% {
            opacity: 1;
            scale: 1;
        }
    }

    .control {
        position: absolute;
        display: flex;
        align-items: stretch;
        justify-content: center;
        bottom: 0rem;
        left: 0;
        right: 0;
        opacity: 0;
        z-index: 1;
        animation: controlOut 0.1s forwards;
        overflow: hidden;
        box-shadow: 0 0 1rem rgba($color: #000000, $alpha: 0.5);
    }

    main:hover > .control {
        animation: controlIn 0.067s forwards;
    }

    @keyframes controlIn {
        0% {
            opacity: 0;
            bottom: -0.3rem;
        }

        100% {
            bottom: 0;
            opacity: 1;
        }
    }

    @keyframes controlOut {
        0% {
            bottom: 0;
            opacity: 1;
        }

        100% {
            opacity: 0;
            bottom: -0.3rem;
        }
    }

    .list {
        height: 100%;
        mask-image: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0) 0%,
            rgba(0, 0, 0, 1) 4%,
            rgba(0, 0, 0, 1) 95%,
            rgba(0, 0, 0, 0) 100%
        );
    }

    .drag {
        width: 100%;
        height: 3rem;
        font-size: 1.2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #eee;
        background: rgba($color: #000000, $alpha: 0.9);
        outline: 1px solid #000;
        cursor: grab;

        > * {
            pointer-events: none;
        }

        > p {
            font-size: 0.778rem;
            font-weight: 500;
            margin-left: 0.5rem;
        }
    }

    .control > button {
        width: 4rem;
        background: rgba($color: #000000, $alpha: 0.9);
        outline: 1px solid #000;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #eee;
        font-size: 1.2rem;
        border-left: 1px solid #444;
        cursor: pointer;

        &:hover {
            background: rgba($color: rgb(206, 13, 13), $alpha: 0.9);
            color: #fff;
        }
    }

    .overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: 0.9rem;
        font-weight: 500;
        pointer-events: none;
        color: #fffc;

        > code {
            color: var(--color-text);
            font-size: 0.8rem;
            margin: 1rem;
        }
    }
</style>
