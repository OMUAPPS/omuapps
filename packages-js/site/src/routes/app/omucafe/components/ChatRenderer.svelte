<script lang="ts">
    import type { Message } from '@omujs/chat/models/message.js';
    import { ComponentRenderer } from '@omujs/ui';
    import { getGame } from '../omucafe-app.js';

    const { omu, chat, side } = getGame();

    let messages: Message[] = [];
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
            messages = [...messages, message]
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
    })
    chat.messages.fetchItems({
        limit: MAX_MESSAGES,
        backward: true,
    }).then((res) => {
        messages = [...res.values()];
    })

</script>

<div class="messages omu-scroll" class:overlay={side === 'overlay'}>
    {#each messages.toReversed() as message (message.id)}
        <div class="message">
            <div class="inner">
                {#if message.authorId}
                    <div class="author">
                        {#await chat.authors.get(message.authorId.key()) then author}
                            {#if author}
                                {#if author.avatarUrl}
                                    <img class="avatar" src={omu.assets.proxy(author.avatarUrl)} alt="">
                                {/if}
                                {author.name}
                            {/if}
                        {/await}
                    </div>
                {/if}
                {#if message.content}
                    <div class="content">
                        <ComponentRenderer component={message.content} />
                    </div>
                {/if}
            </div>
        </div>
    {/each}
</div>


<style lang="scss">
    .messages {
        position: absolute;
        left: 26rem;
        top: 2px;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        height: 30%;
        width: 18rem;
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: 1rem;
        $bevel: 0.25rem;
        clip-path: polygon($bevel 0rem, calc(100% - $bevel) 0rem, 100% $bevel, 100% calc(100% - $bevel), calc(100% - $bevel) 100%, $bevel 100%, 0rem calc(100% - $bevel), 0rem $bevel);
    }

    .overlay {
        overflow: hidden;
        right: 4rem;
        left: unset;
        top: 2rem;
        width: 20rem;
        font-size: 1.4rem;
        padding-right: 0;
        background: #D9AD7D;
        border: 3px solid #A97338;
        padding: 1rem;
    }

    .message {
        display: grid;
        grid-template-rows: 0fr;
        animation: grow 0.1621s ease-in-out forwards;
    }
    
    .message > .inner {
        overflow: hidden;
        padding: 0.5rem 1rem;
        background: var(--color-bg-1);
        margin-bottom: 0.75rem;
        transform-origin: top;
        $bevel: 2px;
        clip-path: polygon($bevel 0rem, calc(100% - $bevel) 0rem, 100% $bevel, 100% calc(100% - $bevel), calc(100% - $bevel) 100%, $bevel 100%, 0rem calc(100% - $bevel), 0rem $bevel);
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
        gap: 0.5rem;
        color: var(--color-1);
        font-size: 0.8em;
    }

    .avatar {
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 100%;
    }

    .content {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
        margin-top: 0.35rem;
        font-size: 1em;
    }
</style>
