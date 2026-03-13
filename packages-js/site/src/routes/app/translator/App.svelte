<script lang="ts">
    import type { Tokenizer } from '@2ji-han/kuromoji.js/tokenizer.js';
    import type { Chat, Models } from '@omujs/chat';
    import { Combobox, MessageEntry, TableList } from '@omujs/ui';
    import type { TranslatorApp } from './translator-app';
    import { getTranslators } from './translators';

    interface Props {
        app: TranslatorApp;
        chat: Chat;
        tokenizer: Tokenizer;
    }

    let { app, chat, tokenizer }: Props = $props();
    const { config } = app;

    const translators = getTranslators(tokenizer);

    let filter = (_: string, message: Models.Message) => message.deleted !== true;

    let sort = (a: Models.Message) => {
        if (!a.createdAt) return 0;
        return a.createdAt.getTime();
    };

    let translator = $derived.by(() => {
        if (!$config.mode) return;
        return translators.find((translator) => translator.id === $config.mode?.id);
    });

    let options = Object.fromEntries(translators.map((translator) => [translator.id, {
        label: translator.name,
        value: { id: translator.id },
    }]));

    chat.messages.proxy((item) => {
        if (!translator) return item;
        return translator.translate(item);
    });
</script>

<Combobox options={{
    ...options,
    none: {
        label: 'なし',
        value: null,
    },
}} bind:value={$config.mode} key={$config.mode?.id} />
<TableList
    table={chat.messages}
    {filter}
    {sort}
    reverse={true}
>
    {#snippet component({ entry, selected })}
        <MessageEntry {entry} {selected} />
    {/snippet}
</TableList>

