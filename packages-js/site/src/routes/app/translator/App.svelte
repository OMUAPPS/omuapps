<script lang="ts">
    import Section from '$lib/components/Section.svelte';
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

    await app.omu.dashboard.apps.addStartup(app.omu.app);
</script>

<main>
    <div class="left">
        <Section name="設定">
            <label>
                翻訳モード
                <Combobox options={{
                    ...options,
                    none: {
                        label: 'なし',
                        value: null,
                    },
                }} bind:value={$config.mode} key={$config.mode?.id} />
            </label>
        </Section>
    </div>
    <div class="chat">
        <Section name="チャット">
            <div class="list">
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
            </div>
        </Section>
    </div>
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        justify-content: space-between;
        align-items: stretch;
        margin: 1.5rem;
        gap: 1rem;
    }

    .left {
        width: 20rem;
    }

    label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--color-1);
        font-size: 0.85rem;
    }

    .chat {
        flex: 1;
        height: 100%;
        background: var(--color-bg-2);
        position: relative;
    }

    .list {
        position: absolute;
        inset: 0;
        top: 3.5rem;
    }
</style>
