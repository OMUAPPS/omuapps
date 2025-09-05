<script lang="ts">
    import { makeRegistryWritable } from '$lib/helper.js';
    import { Chat, ChatEvents } from '@omujs/chat';
    import type { Author, Message } from '@omujs/chat/models';
    import { App, Omu } from '@omujs/omu';
    import { BROWSER } from 'esm-env';

    const APP = new App('com.example:my-keisatsu', {
        version: '1.0.0',
        metadata: {
            locale: 'ja',
            name: '草警察',
            description:
                '【2025年最新版】草を投稿した人を自動で検出して収集するアプリ',
        },
    });
    const omu = new Omu(APP);
    const DEFAULT_CONFIG = {
        filters: ['草'],
    };
    type Config = typeof DEFAULT_CONFIG;
    const configRegistry = omu.registries.json<Config>('config', {
        default: DEFAULT_CONFIG,
    });
    const config = makeRegistryWritable(configRegistry);
    type Comment = {
        id: string;
        authorId: string;
        name: string;
        content: string;
        date: string;
    };
    const table = omu.tables.json<Comment>('comments', {
        key: (item) => item.id,
    });
    const chat = Chat.create(omu);

    chat.on(ChatEvents.message.add, async (message) => {
        if (!message.authorId) return;
        if (!shouldDiscardMessage(message)) return;
        const author = await chat.authors.get(message.authorId.key());
        if (!author) return;
        if (isAuthorAdmin(author)) return;
        const comment: Comment = {
            id: message.id.key(),
            name: author.name ?? '名無し',
            authorId: message.authorId.key(),
            content: message.text,
            date: message.createdAt.toISOString(),
        };
        await table.add(comment);
    });

    if (BROWSER) {
        omu.permissions.require();
        omu.start();
    }

    let comments: Map<string, Comment> = new Map();

    table.listen((newItems) => {
        comments = new Map([
            ...Array.from(comments.entries()),
            ...Array.from(newItems.values()).map(
                (comment): [string, Comment] => [comment.id, comment],
            ),
        ]);
    });
    table.event.clear.listen(() => {
        comments = new Map();
    });
    table.event.remove.listen((removed) => {
        removed.keys().forEach((id) => {
            comments.delete(id);
        });
    });
    omu.onReady(() => {
        table.fetchAll();
    });

    function shouldDiscardMessage(message: Message) {
        return $config.filters
            .map((filter) => filter.trim())
            .filter((it) => it.length > 0)
            .some((filter) => message.text.includes(filter));
    }

    function isAuthorAdmin(author: Author) {
        return author.roles?.some((role) => role.isOwner || role.isModerator);
    }
</script>

<main>
    <div class="config">
        filter:
        {#each $config.filters as filter, i (i)}
            <span>
                <input type="text" bind:value={filter} />
                <button
                    on:click={() => {
                        $config.filters = $config.filters.filter(
                            (_, j) => i !== j,
                        );
                    }}>削除</button
                >
            </span>
        {/each}
        <button
            on:click={() => {
                $config.filters = [...$config.filters, ''];
            }}>追加</button
        >

        <button
            on:click={() => {
                $config = DEFAULT_CONFIG;
            }}
        >
            リセット
        </button>
    </div>
    <div class="comments">
        <h2>
            comments
            <button
                on:click={() => {
                    table.clear();
                }}>すべて削除</button
            >
        </h2>
        {#each Array.from(comments.values()).reverse() as comment (comment.id)}
            <div class="comment">
                {#await chat.authors.get(comment.authorId) then author}
                    {#if author}
                        {#if author.avatarUrl}
                            <img
                                src={omu.assets.proxy(author.avatarUrl)}
                                alt={author.name}
                            />
                        {/if}
                        <p>{author.name}</p>
                    {/if}
                {/await}
                <p>{comment.content}</p>
                <button
                    on:click={() => {
                        table.remove(comment);
                    }}>削除</button
                >
                {new Date(comment.date).toLocaleString()}
            </div>
        {/each}
    </div>
</main>

<style lang="scss">
    main {
        display: flex;
        align-items: start;
        justify-content: space-between;
        gap: 1rem;
        margin: 1rem 0;
        padding: 1rem;
    }

    .config {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .comments {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .comment {
        display: flex;
        flex-direction: row;
        gap: 0.5rem;
        padding: 0.5rem;
        border-radius: 3px;
    }

    img {
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
    }

    button {
        margin-left: auto;
    }
</style>
