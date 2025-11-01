<script lang="ts">
    import type { Models } from '@omujs/chat';

    import { linkOpenHandler, Tooltip } from '@omujs/ui';

    import { omu } from '$lib/client.js';
    import { t } from '$lib/i18n/i18n-context.js';
    import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

    export let entry: Models.Room;
    export let selected: boolean = false;

    function open() {
        if (!entry.metadata.url) return;
        const webviewWindow = new WebviewWindow('room_preview', {
            url: entry.metadata.url,
            title: entry.metadata.title || 'Room Preview',
        });
        webviewWindow.setAutoResize(true);
        webviewWindow.once('tauri://close-requested', () => {
            webviewWindow.destroy();
        });
        webviewWindow.show();
    }

    function copyViewers() {
        const viewers = entry.metadata?.viewers;
        if (viewers == undefined) return;
        navigator.clipboard.writeText(viewers.toString());
    }
</script>

<article class="room" class:selected class:connected={entry.connected}>
    <div class="thumbnail">
        {#if entry.metadata && entry.metadata.thumbnail}
            {#if entry.metadata.url}
                <a href={entry.metadata.url} target="_blank" rel="noopener noreferrer" on:click={(event) => {
                    if (!entry.metadata.url) return;
                    if (!$linkOpenHandler) return;
                    const prevent = $linkOpenHandler(entry.metadata.url);
                    if (!prevent) return;
                    event.preventDefault();
                }}>
                    <Tooltip noBackground>
                        <img
                            src={omu.assets.proxy(entry.metadata.thumbnail)}
                            alt="thumbnail"
                            class="room-thumbnail-preview"
                        />
                    </Tooltip>
                    <img
                        src={omu.assets.proxy(entry.metadata.thumbnail)}
                        alt="thumbnail"
                        class="room-thumbnail"
                    />
                    <div class="overlay">
                        <p>
                            {$t('panels.rooms.see_channel')}
                            <i class="ti ti-external-link"></i>
                        </p>
                    </div>
                </a>
            {:else}
                <Tooltip noBackground>
                    <img
                        src={omu.assets.proxy(entry.metadata.thumbnail)}
                        alt="thumbnail"
                        class="room-thumbnail-preview"
                    />
                </Tooltip>
                <img
                    src={omu.assets.proxy(entry.metadata.thumbnail)}
                    alt="thumbnail"
                    class="room-thumbnail"
                />
            {/if}
        {/if}
    </div>
    <div class="info">
        {#if entry.metadata}
            <div class="title">
                <Tooltip>
                    {entry.metadata.title}
                </Tooltip>
                {entry.metadata.title}
            </div>
            <div class="description">
                <Tooltip>
                    <p>
                        {entry.metadata.description}
                    </p>
                </Tooltip>
                {entry.metadata.description}
            </div>
        {/if}
        <div class="buttons">
            {#if entry.connected}
                <small class="online-state">
                    <Tooltip>
                        {$t('room_status.connected')}
                    </Tooltip>
                    <i class="ti ti-bolt-filled"></i>
                    {$t('room_status.connected')}
                </small>
            {/if}
            {#if entry.metadata && entry.metadata.viewers}
                <button on:click={copyViewers}>
                    <Tooltip>{$t('panels.rooms.viewers')}</Tooltip>
                    {entry.metadata.viewers}
                    <i class="ti ti-user"></i>
                </button>
            {/if}
        </div>
    </div>
</article>

<style lang="scss">
    article {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem;
        background: var(--color-bg-2);
        border-bottom: 1px solid var(--color-bg-1);
        height: 7rem;

        &.selected {
            background: var(--color-bg-1);
            outline: 1px solid var(--color-1);
            outline-offset: -4px;
        }

        &.connected {
            border-left: 2px solid var(--color-1);
        }
    }

    .thumbnail {
        position: relative;
        height: 100%;
        aspect-ratio: 16 / 9;
        object-fit: contain;

        > a {
            position: relative;
            border: none;
            background: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            width: 100%;
            height: 100%;

            > img {
                inset: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
        }

        > a > .overlay {
            position: absolute;
            inset: 0;
            background: color-mix(in srgb, var(--color-text) 70%, transparent 0%);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;

            > p {
                background: var(--color-text);
                color: var(--color-bg-1);
                padding: 0.25rem 0.5rem;
                border-radius: 2px;
                font-size: 0.8rem;
            }
        }
    }

    .room-thumbnail-preview {
        width: 300px;
        object-fit: contain;
        outline: 2px solid #000;
    }

    .info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        height: fit-content;
    }

    .buttons {
        display: flex;
        align-items: center;
        width: 100%;
        margin-top: 0.25rem;

        > button {
            display: flex;
            align-items: baseline;
            justify-content: center;
            padding: 0.25rem 0.5rem;
            border: none;
            background: none;
            height: 2rem;
            border-radius: 2px;
            font-size: 0.8rem;
            cursor: pointer;

            &:hover {
                background: var(--color-bg-2);
                outline: 1px solid var(--color-1);
                outline-offset: -1px;
            }
        }
    }

    .online-state {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.75rem;
        margin-right: 0.5rem;
        color: var(--color-1);
        border-bottom: 2px solid var(--color-1);
        padding-bottom: 0.25rem;
    }

    .title {
        overflow: hidden;
        font-size: 0.9rem;
        font-weight: bold;
        color: var(--color-1);
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .description {
        overflow: hidden;
        font-size: 0.7rem;
        color: var(--color-text);
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    p {
        white-space: pre-wrap;
        font-size: 0.5rem;
    }
</style>
