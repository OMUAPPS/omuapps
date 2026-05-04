<script lang="ts">
    import { Models } from '@omujs/chat';
    import { ComponentRenderer } from '@omujs/ui';
    import { ChatOverlayApp } from '../../chat-app';

    let { chat } = ChatOverlayApp.getInstance();

    interface Props {
        messages: Models.Message[];
    }

    let { messages }: Props = $props();

    let message = $derived(messages.at(-1));
    let author = $derived(message && message.authorId && chat.authors.get(message.authorId.key()));
    let height = $state(0);
</script>

<div id="chat" class="style-scope yt-live-chat-renderer">
    <yt-live-chat-pinned-message-renderer
        id="pinned-message"
        disable-upgrade=""
        hidden=""
        class="style-scope yt-live-chat-renderer"
    ></yt-live-chat-pinned-message-renderer>
    <div id="item-list" class="style-scope yt-live-chat-renderer">
        <yt-live-chat-item-list-renderer
            class="style-scope yt-live-chat-renderer"
            allow-scroll=""
            id="live-chat-item-list-panel"
        >
            <div
                id="contents"
                class="style-scope yt-live-chat-item-list-renderer"
                bind:clientHeight={height}
            >
                <div
                    id="item-scroller"
                    class="style-scope yt-live-chat-item-list-renderer"
                >
                    <yt-live-chat-docked-message
                        id="docked-messages"
                        class="style-scope yt-live-chat-item-list-renderer"
                    >
                        <div
                            id="container"
                            class="style-scope yt-live-chat-docked-message"
                        >
                            <div
                                id="docked-item"
                                class="style-scope yt-live-chat-docked-message"
                            ></div>
                            <div
                                id="undocking-item"
                                class="style-scope yt-live-chat-docked-message"
                            ></div>
                        </div>
                    </yt-live-chat-docked-message>
                    <yt-live-chat-banner-manager
                        id="live-chat-banner"
                        class="style-scope yt-live-chat-item-list-renderer"
                    >
                        <div
                            id="visible-banners"
                            class="style-scope yt-live-chat-banner-manager"
                        ></div>
                    </yt-live-chat-banner-manager>
                    <div
                        id="item-offset"
                        class="style-scope yt-live-chat-item-list-renderer"
                        style="height: {height}px;"
                    >
                        <div
                            id="items"
                            class="style-scope yt-live-chat-item-list-renderer"
                            style="transform: translateY(0px);"
                        >
                            {#if message}
                                {#await author then author}
                                    {@const isModerator = author?.roles?.some((role) => role.isModerator)}
                                    {@const isOwner = author?.roles?.some((role) => role.isOwner)}
                                    <yt-live-chat-text-message-renderer
                                        class="style-scope yt-live-chat-item-list-renderer"
                                        modern=""
                                        id={message.id.path.at(-1)}
                                        whole-message-clickable=""
                                        author-type={isOwner ? 'owner' : isModerator ? 'moderator' : ''}
                                    >
                                        <yt-img-shadow
                                            id="author-photo"
                                            class="no-transition style-scope yt-live-chat-text-message-renderer"
                                            height="24"
                                            width="24"
                                            style="background-color: transparent;"
                                            loaded=""
                                        >
                                            <img
                                                id="img"
                                                draggable="false"
                                                class="style-scope yt-img-shadow"
                                                alt=""
                                                height="24"
                                                width="24"
                                                src={author?.avatarUrl}
                                            />
                                        </yt-img-shadow>
                                        <div
                                            id="content"
                                            class="style-scope yt-live-chat-text-message-renderer"
                                        >
                                            <yt-live-chat-author-chip
                                                class="style-scope yt-live-chat-text-message-renderer"
                                                enable-new-moderator-text-color=""
                                            >
                                                <span
                                                    id="prepend-chat-badges"
                                                    class="style-scope yt-live-chat-author-chip"
                                                ></span>
                                                <span
                                                    id="author-name"
                                                    dir="auto"
                                                    class="{isModerator ? 'moderator' : ''} style-scope yt-live-chat-author-chip style-scope yt-live-chat-author-chip"
                                                >{author?.name ??
                                                    author?.metadata
                                                        .screen_id}<span
                                                    id="chip-badges"
                                                    class="style-scope yt-live-chat-author-chip"
                                                ></span>
                                                </span>
                                                <span
                                                    id="chat-badges"
                                                    class="style-scope yt-live-chat-author-chip"
                                                >
                                                    {#each author?.roles as role, index (index)}
                                                        <yt-live-chat-author-badge-renderer
                                                            class="style-scope yt-live-chat-author-chip"
                                                            enable-new-moderator-badge=""
                                                            aria-label={role.name}
                                                            type={role.isModerator
                                                                ? 'moderator'
                                                                : role.isOwner ? 'owner' : 'member'}
                                                            shared-tooltip-text={role.name}
                                                        >
                                                            <div
                                                                id="image"
                                                                class="style-scope yt-live-chat-author-badge-renderer"
                                                            >
                                                                <yt-icon
                                                                    class="style-scope yt-live-chat-author-badge-renderer"
                                                                >
                                                                    <span
                                                                        class="yt-icon-shape style-scope yt-icon ytSpecIconShapeHost"
                                                                    >
                                                                        <div
                                                                            style="width: 100%; height: 100%; display: block; fill: currentcolor;"
                                                                        >
                                                                            <img
                                                                                src={role.iconUrl}
                                                                                alt={role.name}
                                                                                style="width: 100%; height: 100%;"
                                                                            />
                                                                        </div>
                                                                    </span>
                                                                </yt-icon>
                                                            </div>
                                                        </yt-live-chat-author-badge-renderer>
                                                    {/each}
                                                </span>
                                            </yt-live-chat-author-chip>
                                            <div
                                                id="before-content-buttons"
                                                class="style-scope yt-live-chat-text-message-renderer"
                                            ></div>
                                            <span
                                                id="message"
                                                dir="auto"
                                                class="style-scope yt-live-chat-text-message-renderer"
                                            >
                                                {#if message.content}
                                                    <ComponentRenderer
                                                        component={message.content}
                                                    />
                                                {/if}
                                            </span>
                                            <span
                                                id="hover-message"
                                                dir="auto"
                                                class="style-scope yt-live-chat-text-message-renderer"
                                            ></span>
                                            <span
                                                id="deleted-state"
                                                class="style-scope yt-live-chat-text-message-renderer"
                                            ></span>
                                        </div>
                                        <div
                                            id="inline-action-button-container"
                                            class="style-scope yt-live-chat-text-message-renderer"
                                            aria-hidden="true"
                                        >
                                            <div
                                                id="inline-action-buttons"
                                                class="style-scope yt-live-chat-text-message-renderer"
                                            ></div>
                                        </div>
                                    </yt-live-chat-text-message-renderer>
                                {/await}
                            {/if}
                        </div>
                    </div>
                </div>
                <div
                    id="empty-state-message"
                    class="style-scope yt-live-chat-item-list-renderer"
                    hidden=""
                ></div>
            </div>
        </yt-live-chat-item-list-renderer>
    </div>
    <div id="action-panel" class="style-scope yt-live-chat-renderer"></div>
    <yt-live-chat-animation-overlay-renderer
        id="animation-overlay"
        class="style-scope yt-live-chat-renderer"
    >
        <ytd-lottie-player
            class="style-scope yt-live-chat-animation-overlay-renderer"
        ></ytd-lottie-player>
    </yt-live-chat-animation-overlay-renderer>
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
