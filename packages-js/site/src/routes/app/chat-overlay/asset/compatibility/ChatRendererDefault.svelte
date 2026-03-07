<script lang="ts">
    import { Models } from "@omujs/chat";
    import { ComponentRenderer } from "@omujs/ui";
    import HeightTransition from "../../_components/HeightTransition.svelte";
    import { ChatOverlayApp } from "../../chat-app";

    let { chat, config } = ChatOverlayApp.getInstance();

    interface Props {
        messages: Models.Message[];
    }

    let { messages }: Props = $props();
</script>

<div
    id="container"
    class="container"
    class:newer-bottom={$config.asset.list.direction === "newer-bottom"}
>
    <div class="fade">
        <div class="list">
            <div class="messages comments">
                {#each [...new Map(messages.map( (m) => [m.key(), m], )).values()] as message (message.key())}
                    {@const author =
                        message.authorId &&
                        chat.authors.get(message.authorId.key())}
                    {#await author then author}
                        <HeightTransition duration={150}>
                            <div
                                class="message comment"
                                data-user={author?.name ??
                                    author?.metadata.screen_id}
                                data-paid={!!message.paid}
                            >
                                {#if author}
                                    <div class="avatar">
                                        <img src={author.avatarUrl} alt="" />
                                    </div>
                                {/if}
                                {#if message.content}
                                    <div class="content comment-block">
                                        {#if author}
                                            <div class="name">
                                                {author.name ??
                                                    author.metadata.screen_id}
                                            </div>
                                        {/if}
                                        <div class="body comment-body">
                                            <ComponentRenderer
                                                component={message.content}
                                            />
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        </HeightTransition>
                    {/await}
                {/each}
            </div>
        </div>
    </div>
</div>

<style>
    :global(body) {
        background: transparent !important;
        overflow: hidden;
    }

    :root {
        --lcv-name-color: rgb(238, 238, 238, 0.7);
        --lcv-text-color: #eee;
    }

    .container {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.65);
        border-radius: 1rem;
        color: #eee;
    }

    .messages {
        display: flex;
        flex-direction: column-reverse;
        justify-content: flex-end;
        align-items: flex-start;
        gap: 1rem;
        font-size: 1.2rem;
        padding: 1rem 1.5rem;
        overflow: hidden;
        transition: background 0.1s;
        animation: fade 0.2s forwards;
    }

    .fade {
        position: absolute;
        inset: 0;
        mask-image: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 1) 95%,
            rgba(0, 0, 0, 0) 100%
        );
    }

    .list {
        position: absolute;
        inset: 0;
    }

    @keyframes fade {
        0% {
            opacity: 0;
            scale: 0.95;
        }

        100% {
            opacity: 1;
            scale: 1;
        }
    }

    .message {
        display: flex;
        animation: message-in-down 150ms forwards;
    }

    @keyframes message-in-down {
        0% {
            transform: translateY(-100%);
        }
        100% {
            transform: translateY(0);
        }
    }

    .newer-bottom {
        > .fade {
            mask-image: linear-gradient(
                to top,
                rgba(0, 0, 0, 1) 95%,
                rgba(0, 0, 0, 0) 100%
            );

            > .list {
                top: unset;

                > .messages {
                    flex-direction: column;

                    .message {
                        animation: message-in-up 150ms forwards;
                    }
                }
            }
        }
    }

    @keyframes message-in-up {
        0% {
            transform: translateY(100%);
        }
        100% {
            transform: translateY(0);
        }
    }

    .name {
        font-size: 0.8em;
        vertical-align: text-top;
        margin-bottom: 0.25rem;
        color: var(--lcv-name-color);
    }

    .avatar {
        > img {
            border-radius: 999px;
            width: 2rem;
            height: 2rem;
        }
        margin-right: 1rem;
    }

    .body {
        color: var(--lcv-text-color);
    }
</style>
