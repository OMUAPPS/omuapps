<script lang="ts">
    import type { models } from '@omujs/chat';

    import { ClipboardHelper } from '$lib/utils/clipboard-helper.js';
    import { ButtonMini, FlexRowWrapper, Tooltip } from '@omujs/ui';

    import { omu } from '$lib/client.js';
    import { t } from '$lib/i18n/i18n-context.js';

    export let entry: models.Room;
    export let selected: boolean = false;

    function open() {
        window.open(entry.metadata?.url, '_blank');
    }

    function copyViewers() {
        if (!entry.metadata?.viewers) return;
        ClipboardHelper.writeText(entry.metadata?.viewers.toString());
    }
</script>

<article class="room" class:selected class:connected={entry.connected}>
    <div class="top">
        <div>
            {#if entry.metadata && entry.metadata.thumbnail}
                <img
                    src={omu.assets.proxy(entry.metadata.thumbnail)}
                    alt="thumbnail"
                    class="room-thumbnail"
                />
                <Tooltip noBackground>
                    <img
                        src={omu.assets.proxy(entry.metadata.thumbnail)}
                        alt="thumbnail"
                        class="room-thumbnail-preview"
                    />
                </Tooltip>
            {/if}
        </div>
        <div class="buttons">
            <FlexRowWrapper widthFull>
                <ButtonMini on:click={open}>
                    <Tooltip>{$t('panels.rooms.see_channel')}</Tooltip>
                    <i class="ti ti-external-link" />
                </ButtonMini>
            </FlexRowWrapper>
            <FlexRowWrapper widthFull between>
                {#if entry.metadata}
                    <ButtonMini on:click={copyViewers}>
                        <Tooltip>{$t('panels.rooms.viewers')}</Tooltip>
                        {entry.metadata.viewers}
                        <i class="ti ti-user" />
                    </ButtonMini>
                {/if}
                <i class={`online-state ti ti-bolt ${entry.connected ? 'online' : 'offline'}`}>
                    <Tooltip>
                        {entry.connected ? $t('status.connected') : $t('status.disconnected')}
                    </Tooltip>
                </i>
            </FlexRowWrapper>
        </div>
    </div>
    <div>
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
    </div>
</article>

<style lang="scss">
    article {
        padding: 10px;
        background: var(--color-bg-2);
        border-bottom: 1px solid var(--color-bg-1);

        &.selected {
            background: var(--color-bg-1);
            outline: 1px solid var(--color-1);
            outline-offset: -4px;
        }

        &.connected {
            border-left: 2px solid var(--color-1);
        }
    }

    .top {
        display: flex;
        flex-direction: row;
        width: 100%;
    }

    .buttons {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        width: 100%;
        height: 20px;
        margin-left: 5px;
    }

    .online-state {
        margin-left: 5px;
    }

    .online {
        color: var(--color-1);
    }

    .offline {
        color: #ccc;
    }

    .room-thumbnail {
        width: 100px;
        min-width: 100px;
        min-height: 56px;
        object-fit: contain;
    }

    .room-thumbnail-preview {
        width: 300px;
        object-fit: contain;
        outline: 2px solid #000;
    }

    .title {
        overflow: hidden;
        font-size: 14px;
        font-weight: bold;
        color: var(--color-1);
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .description {
        overflow: hidden;
        font-size: 12px;
        color: color-mix(in srgb, var(--color-1) 100%, transparent 50%);
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    p {
        white-space: pre-wrap;
        font-size: 0.5rem;
    }
</style>
