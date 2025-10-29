<script lang="ts">
    import type { Models } from '@omujs/chat';
    import { onDestroy } from 'svelte';

    import { chat } from '$lib/client.js';
    import type { Identifier } from '@omujs/omu';
    import { MessageEntry, TableList } from '@omujs/ui';

    export let filter: (key: string, message: Models.Message) => boolean = (
        _,
        message,
    ) => message.deleted !== true;
    let sort = (a: Models.Message) => {
        if (!a.createdAt) return 0;
        return a.createdAt.getTime();
    };

    onDestroy(chat.authors.listen());
    onDestroy(
        chat.messages.listen((items) => {
            const authorKeys = [...items.values()]
                .map((message) => message.authorId)
                .filter((key): key is Identifier => !!key);
            chat.authors.getMany(...authorKeys.map((it) => it.key()));
        }),
    );
</script>

<TableList
    table={chat.messages}
    component={MessageEntry}
    {filter}
    {sort}
    reverse={true}
/>
