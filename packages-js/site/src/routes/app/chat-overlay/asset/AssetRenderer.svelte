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

    let visibleMessages = $derived.by(() => {
        if (!$config.chat.filter.onlyConnected) return messages;
        return messages.filter((msg) => onlineRoomIds.has(msg.roomId.key()));
    });

    const updateOnlineRooms = (rooms: Map<string, Models.Room> | Models.Room[]) => {
        const roomArray = rooms instanceof Map ? Array.from(rooms.values()) : rooms;
        onlineRoomIds = new Set(
            roomArray.filter(r => r.connected).map(r => r.id.key()),
        );
    };

    chat.on(ChatEvents.Message.Add, (message) => {
        messages = [...messages.slice(-(MAX_MESSAGES - 1)), message];
    });

    const unlistenRooms = chat.rooms.listen(updateOnlineRooms);

    omu.onReady(async () => {
        const [initialMessages, initialRooms] = await Promise.all([
            chat.messages.fetchItems({ limit: MAX_MESSAGES, backward: true }),
            chat.rooms.fetchItems({ limit: MAX_MESSAGES, backward: true }),
        ]);

        messages = Array.from(initialMessages.values());
        updateOnlineRooms(Array.from(initialRooms.values()));
    });

    onDestroy(() => {
        unlistenRooms();
    });
</script>

{#if $config.asset.type === 'youtube'}
    <ChatRendererYoutube messages={visibleMessages} />
{:else}
    <ChatRendererDefault messages={visibleMessages} />
{/if}

<svelte:element this={'style'}>
    {$config.asset.css}
</svelte:element>
