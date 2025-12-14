<script lang="ts">
    import { Chat, ChatEvents, ChatPermissions, Models } from '@omujs/chat';
    import { OmuPermissions, type Omu } from '@omujs/omu';
    import { ComponentRenderer } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { ChatOverlayApp } from '../chat-app';

    interface Props {
        omu: Omu;
    }

    let { omu }: Props = $props();
    const chatApp = new ChatOverlayApp(omu);
    const chat = Chat.create(omu);

    if (BROWSER) {
        omu.permissions.require(
            OmuPermissions.ASSET_PERMISSION_ID,
            ChatPermissions.CHAT_PERMISSION_ID,
        );
        omu.start();
    }

    let messages: Models.Message[] = $state([]);

    const limit = 20;

    omu.onReady(async () => {
        // const initial = await chat.messages.fetchItems({
        //     backward: true,
        //     limit,
        // });
        // messages = [...initial.values()].sort(comparator((a: Models.Message) => {
        //     if (!a.createdAt) return 0;
        //     return a.createdAt.getTime();
        // }));
        chat.on(ChatEvents.Message.Add, (message) => {
            messages.push(message);
            if (messages.length > limit) {
                messages.shift();
            }
        });
    });
</script>

<main>
    <div class="messages">
        {#each messages.filter((it) => it) as message, index (index)}
            <svelte:boundary onerror={(err) => {
                console.error(err);
            }}>
                {@const author = message.authorId && chat.authors.get(message.authorId.key())}
                {#await author then author}
                    <div class="message">
                        {#if author}
                            <div class="author">
                                <div class="avatar">
                                    <img src={author.avatarUrl} alt="">
                                </div>
                                <div class="name">
                                    {author.name ?? author.metadata.screen_id}
                                </div>
                            </div>
                        {/if}
                        {#if message.content}
                            <div class="content">
                                <ComponentRenderer component={message.content} />
                            </div>
                        {/if}
                    </div>
                {/await}
            </svelte:boundary>
        {/each}
    </div>
</main>

<style>
    :root {
        interpolate-size: allow-keywords;
    }

    :global(body) {
        background: transparent !important;
        overflow: hidden;
    }

    .messages {
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: flex-start;
        gap: 1rem;
    }

    .message {
        background: var(--color-bg-1);
        padding: 1rem;
        padding-right: 4rem;
        animation: fade forwards 0.3621s;
        overflow: hidden;
        white-space: nowrap;
        display: flex;
        flex-direction: column;
        grid-auto-flow: column;
        gap: 0.25rem;
        font-size: 1.3rem;
        max-width: 20rem;
        text-wrap: auto;
        white-space: wrap;
    }

    .author {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
        color: var(--color-text);

        > .avatar > img {
            border-radius: 10rem;
            width: 1.5rem;
            height: 1.5rem;
        }
    }

    @keyframes fade {
        0% {
            height: 0;
            color: var(--color-bg-2);
            outline: 1px solid var(--color-1);
            outline-offset: 0.0rem;
            transform: skewY(3deg);
        }
        100% {
            outline-offset: 0.5rem;
            height: auto;
        }
    }

    main {
        position: absolute;
        inset: 0;
        color: var(--color-1);
        container-type: inline-size;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: flex-start;
        padding: 2rem;
        gap: 1rem;
    }
</style>
