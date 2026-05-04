<script lang="ts">
    import type { Models } from '@omujs/chat';
    import { ComponentRenderer } from '@omujs/ui';
    import { onMount } from 'svelte';
    import { ChatOverlayApp } from '../../../chat-app';

    let { message }: { message: Models.Message } = $props();

    let { chat } = ChatOverlayApp.getInstance();

    let author: Models.Author | undefined = $state();

    async function load() {
        if (message.authorId) {
            author = await chat.authors.get(message.authorId.key());
        }
    }

    onMount(() => {
        return chat.authors.listen((authors) => {
            if (!message.authorId) return;
            author = authors.get(message.authorId.key());
        });
    });

    load();
</script>

{#if author}
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
                >
                    {author?.name ?? author?.metadata.screen_id}
                    <span id="chip-badges" class="style-scope yt-live-chat-author-chip"></span>
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
{/if}
