<script lang="ts">
    import type { Models } from '@omujs/chat';

    import MessageRenderer from './MessageRenderer.svelte';
    import { chat } from './stores.js';

    interface Props {
        entry: Models.Message;
        selected?: boolean;
    }

    let { entry, selected = false }: Props = $props();

    let author: Models.Author | undefined = $state();
    let room: Models.Room | undefined = $state();

    if (entry.authorId) {
        $chat.authors.get(entry.authorId.key()).then((res) => {
            author = res;
        });
    }
    $chat.rooms.get(entry.roomId.key()).then((res) => {
        room = res;
    });

    function handleCopy() {
        navigator.clipboard.writeText(entry.text);
    }
</script>

<MessageRenderer
    paid={entry.paid}
    gifts={entry.gifts}
    createdAt={entry.createdAt}
    content={entry.content}
    {room}
    {author}
    {handleCopy}
    {selected}
/>
