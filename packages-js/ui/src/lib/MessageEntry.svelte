<script lang="ts">
    import type { models } from '@omujs/chat';

    import MessageRenderer from './MessageRenderer.svelte';
    import { chat } from './stores.js';

    export let entry: models.Message;
    export let selected: boolean = false;

    let author: models.Author | undefined;
    let room: models.Room | undefined;

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
