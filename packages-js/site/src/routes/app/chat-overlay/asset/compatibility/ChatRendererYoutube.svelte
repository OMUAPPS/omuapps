<script lang="ts">
    import { Models } from '@omujs/chat';
    import YoutubeEntry from './_components/YoutubeEntry.svelte';
    import './youtube.css';

    interface Props {
        messages: Models.Message[];
    }

    let { messages }: Props = $props();
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
                            {#each [...new Map(messages.map((m) => [m.key(), m])).values()] as message (message.key())}
                                <YoutubeEntry {message} />
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
