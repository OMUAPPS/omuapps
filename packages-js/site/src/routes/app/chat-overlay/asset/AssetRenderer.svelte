<script lang="ts">
    import { ChatEvents, type Models } from '@omujs/chat';
    import { onDestroy } from 'svelte';
    import { ChatOverlayApp } from '../chat-app';
    import ChatRendererDefault from './compatibility/ChatRendererDefault.svelte';
    import ChatRendererYoutube from './compatibility/ChatRendererYoutube.svelte';

    const MAX_MESSAGES = 20;
    const { omu, chat, config } = ChatOverlayApp.getInstance();

    let messages = $state<Models.Message[]>([]);
    let onlineRoomIds = $state<Set<string>>(new Set());

    let filteredMessages: Models.Message[] = $derived.by(() => {
        if (!$config.chat.filter.onlyConnected) return messages.filter((msg) => !msg.deleted);
        return messages.filter((msg) => {
            if (msg.deleted) return false;
            return onlineRoomIds.has(msg.roomId.key());
        });
    });
    let sortedMessages: Models.Message[] = $derived.by(() => {
        return [...filteredMessages].sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        );
    });
    let visibleMessages: Models.Message[] = $derived.by(() => {
        if ($config.asset.displayCount === undefined) return sortedMessages;
        const sliced = sortedMessages.slice(
            sortedMessages.length - $config.asset.displayCount,
        );
        return sliced;
    });

    const updateOnlineRooms = (
        rooms: Map<string, Models.Room> | Models.Room[],
    ) => {
        const roomArray =
            rooms instanceof Map ? Array.from(rooms.values()) : rooms;
        onlineRoomIds = new Set(
            roomArray.filter((r) => r.connected).map((r) => r.id.key()),
        );
    };

    chat.on(ChatEvents.Message.Add, (message) => {
        messages = [...messages.slice(-(MAX_MESSAGES - 1)), message];
    });

    chat.on(ChatEvents.Message.Update, (message) => {
        messages = messages.map((msg) => {
            if (msg.id.key() === message.id.key()) {
                return message;
            }
            return msg;
        });
    });

    const unlistenRooms = chat.rooms.listen(updateOnlineRooms);
    const unlistenAuthors = chat.authors.listen();

    omu.onReady(async () => {
        const [initialMessages, initialRooms] = await Promise.all([
            chat.messages.fetchItems({ limit: MAX_MESSAGES, backward: true }),
            chat.rooms.fetchItems({ limit: MAX_MESSAGES, backward: true }),
        ]);

        messages = Array.from(initialMessages.values());
        messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        updateOnlineRooms(Array.from(initialRooms.values()));
    });

    onDestroy(() => {
        unlistenRooms();
        unlistenAuthors();
    });
</script>

{#if $config.asset.type === 'youtube'}
    <ChatRendererYoutube messages={visibleMessages} />
{:else if $config.asset.type === 'default'}
    <ChatRendererDefault messages={visibleMessages} />
{/if}

<svelte:element this={'style'}>
    {$config.asset.css}
</svelte:element>
