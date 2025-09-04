<script lang="ts">
    import type { models } from "@omujs/chat";
    import { onDestroy } from "svelte";

    import { chat } from "$lib/client.js";
    import type { Identifier } from "@omujs/omu";
    import { MessageEntry, TableList } from "@omujs/ui";

    export let filter: (key: string, message: models.Message) => boolean = (
        _,
        message,
    ) => message.deleted !== true;
    export let sort: (a: models.Message, b: models.Message) => number = (
        a,
        b,
    ) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return a.createdAt.getTime() - b.createdAt.getTime();
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
