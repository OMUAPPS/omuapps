<script lang="ts">
    import type { models } from '@omujs/chat';
    import { onDestroy } from 'svelte';

    import { chat } from '$lib/client.js';
    import { batchCall } from '$lib/utils/batch.js';
    import type { Identifier } from '@omujs/omu/identifier.js';
    import { MessageEntry, TableList } from '@omujs/ui';

    export let filter: (key: string, message: models.Message) => boolean = (_, message) => message.deleted !== true;
    export let sort: (a: models.Message, b: models.Message) => number = (a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return a.createdAt.getTime() - b.createdAt.getTime();
    };

    const unlisten = batchCall(
        chat.authors.listen(),
        chat.messages.listen((items) => {
            const authorKeys = [...items.values()]
                .map((message) => message.authorId)
                .filter((key): key is Identifier => !!key);
            chat.authors.getMany(...authorKeys.map((it) => it.key()));
        }),
    );
    onDestroy(unlisten);
</script>

<TableList table={chat.messages} component={MessageEntry} {filter} {sort} reverse={true} />
