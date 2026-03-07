<script lang="ts">
    import { Models } from "@omujs/chat";
    import { ComponentRenderer } from "@omujs/ui";
    import { ChatOverlayApp } from "../../chat-app";
    import "./youtube.css";

    let { chat, config } = ChatOverlayApp.getInstance();

    interface Props {
        messages: Models.Message[];
    }

    let { messages }: Props = $props();
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
                        style="height: {window.innerHeight}px;"
                    >
                        <div
                            id="items"
                            class="style-scope yt-live-chat-item-list-renderer"
                            style="transform: translateY(0px);"
                        >
                            {#each [...new Map(messages.map( (m) => [m.key(), m], )).values()] as message (message.key())}
                                {@const author =
                                    message.authorId &&
                                    chat.authors.get(message.authorId.key())}
                                {#await author then author}
                                    <yt-live-chat-text-message-renderer
                                        class="style-scope yt-live-chat-item-list-renderer"
                                        modern=""
                                        id={message.id.path.at(-1)}
                                        whole-message-clickable=""
                                        author-type="moderator"
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
                                                    class="moderator style-scope yt-live-chat-author-chip style-scope yt-live-chat-author-chip"
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
                                                                ? "moderator"
                                                                : role.isOwner
                                                                  ? "owner"
                                                                  : "member"}
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
                            {/each}
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
