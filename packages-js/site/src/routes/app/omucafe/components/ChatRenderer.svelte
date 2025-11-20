<script lang="ts">
    import type { Message } from '@omujs/chat/models';
    import { Button, ComponentRenderer } from '@omujs/ui';
    import { getGame } from '../omucafe-app.js';

    const { omu, scene, chat, side, config } = getGame();

    let messages: Message[] = $state([]);
    let messageQueue: Message[] = [];
    const MAX_MESSAGES = 40;

    let queueTimer: number | null = null;

    function updateQueue() {
        if (queueTimer) return;
        if (messageQueue.length === 0) return;
        const delay = 1000 / messageQueue.length;
        queueTimer = window.setTimeout(() => {
            queueTimer = null;
            const message = messageQueue.shift();
            if (!message) return;
            messages = [...messages, message];
            if (messages.length > MAX_MESSAGES) {
                messages.splice(0, messages.length - MAX_MESSAGES);
            }
            updateQueue();
        }, delay);
    }

    chat.messages.listen();
    chat.messages.event.add.listen((value) => {
        messageQueue = [...messageQueue, ...value.values()];
        updateQueue();
    });
    chat.messages
        .fetchItems({
            limit: MAX_MESSAGES,
            backward: true,
        })
        .then((res) => {
            messages = [...res.values()];
        });
</script>

<div
    class="container"
    class:overlay={side === 'overlay'}
    class:hide={side === 'overlay' &&
        ($scene.type === 'photo_mode' || !$config.chat.show)}
>
    {#if side === 'client'}
        <Button
            primary
            onclick={() => {
                $config.chat.show = !$config.chat.show;
            }}
        >
            {#if $config.chat.show}
                チャットをしまう
            {:else}
                チャットを開く
            {/if}
        </Button>
    {/if}
    {#if $config.chat.show}
        <div class="messages omu-scroll">
            {#each messages.toReversed() as message (message.id)}
                <div class="message">
                    <div class="inner">
                        {#if message.authorId}
                            <div class="author">
                                {#await chat.authors.get(message.authorId.key()) then author}
                                    {#if author}
                                        {#if author.avatarUrl}
                                            <img
                                                class="avatar"
                                                src={omu.assets.proxy(
                                                    author.avatarUrl,
                                                )}
                                                alt=""
                                            />
                                        {/if}
                                        {author.name}
                                    {/if}
                                {/await}
                            </div>
                        {/if}
                        {#if message.content}
                            <div class="content">
                                <ComponentRenderer
                                    component={message.content}
                                />
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style lang="scss">
    .container {
        position: absolute;
        left: 26rem;
        top: 2px;
        height: 30%;
        $bevel: 0.25rem;
        clip-path: polygon(
            $bevel 0rem,
            calc(100% - $bevel) 0rem,
            100% $bevel,
            100% calc(100% - $bevel),
            calc(100% - $bevel) 100%,
            $bevel 100%,
            0rem calc(100% - $bevel),
            0rem $bevel
        );
    }

    .messages {
        padding-right: 1rem;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        height: 100%;
        width: 18rem;
        overflow-y: auto;
        overflow-x: hidden;
    }

    .overlay {
        overflow: hidden;
        right: 4rem;
        left: unset;
        top: 2rem;
        width: 20rem;
        font-size: 1.4rem;
        padding-right: 0;
        background: #d9ad7d;
        border: 3px solid #a97338;
        padding: 1rem;
    }

    .hide {
        overflow: hidden;
        right: 0;
        left: unset;
        top: unset;
        bottom: 0;
        height: 6rem;
        font-size: 1.2rem;
        border: none;
        background: none;
    }

    .message {
        display: grid;
        grid-template-rows: 0fr;
        animation: grow 0.1621s ease-in-out forwards;
    }

    .message > .inner {
        overflow: hidden;
        padding: 0.5em 1em;
        background: var(--color-bg-1);
        margin-bottom: 0.75em;
        transform-origin: top;
        $bevel: 2px;
        clip-path: polygon(
            $bevel 0rem,
            calc(100% - $bevel) 0rem,
            100% $bevel,
            100% calc(100% - $bevel),
            calc(100% - $bevel) 100%,
            $bevel 100%,
            0rem calc(100% - $bevel),
            0rem $bevel
        );
    }

    @keyframes grow {
        0% {
            grid-template-rows: 0fr;
            transform: scaleY(0);
        }

        70% {
            grid-template-rows: 1fr;
            transform: scaleY(0) translateX(1rem);
        }

        100% {
            grid-template-rows: 1fr;
            transform: scaleY(1);
        }
    }

    .author {
        display: flex;
        align-items: center;
        gap: 0.5em;
        color: var(--color-1);
        font-size: 0.8em;
    }

    .avatar {
        width: 1.5em;
        height: 1.5em;
        border-radius: 100%;
    }

    .content {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25em;
        margin-top: 0.35em;
        font-size: 1em;
    }
</style>
