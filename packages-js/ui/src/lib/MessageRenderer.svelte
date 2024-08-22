<script lang="ts">
    import type { models } from '@omujs/chat';
    import { Paid } from '@omujs/chat/models/paid.js';
    import ComponentRenderer from './ComponentRenderer.svelte';
    import FlexColWrapper from './FlexColWrapper.svelte';
    import FlexRowWrapper from './FlexRowWrapper.svelte';
    import Gift from './Gift.svelte';
    import RelativeDate from './RelativeDate.svelte';
    import Role from './Role.svelte';
    import Tooltip from './Tooltip.svelte';
    import { client, dateTimeFormats, translate } from './stores.js';
    import { applyOpacity } from './utils/class-helper.js';

    export let paid: Paid | undefined = undefined;
    export let gifts: Array<models.Gift> | undefined = undefined;
    export let author: models.Author | undefined = undefined;
    export let createdAt: Date | undefined = undefined;
    export let content: models.content.Component | undefined = undefined;
    export let handleCopy: () => void = () => {};
    export let selected: boolean = false;
</script>

<article
    class:special={!!(paid || gifts?.length)}
    class:selected
    style:background={paid || gifts?.length
        ? applyOpacity(paid ? 'var(--color-1)' : 'var(--color-2)', 0.1)
        : undefined}
>
    <FlexRowWrapper widthFull gap>
        {#if author && author.avatarUrl}
            <FlexColWrapper>
                {#if author.metadata?.url}
                    <a href={author.metadata.url} target="_blank">
                        <img
                            src={$client.assets.proxy(author.avatarUrl)}
                            alt="avatar"
                            class="author-avatar"
                            width="32"
                            height="32"
                        />
                    </a>
                {:else}
                    <img
                        src={$client.assets.proxy(author.avatarUrl)}
                        alt="avatar"
                        class="author-avatar"
                        width="32"
                        height="32"
                    />
                {/if}
                <Tooltip noBackground>
                    <img
                        src={$client.assets.proxy(author.avatarUrl)}
                        alt="avatar"
                        class="author-avatar-preview"
                    />
                </Tooltip>
            </FlexColWrapper>
        {/if}
        <FlexColWrapper widthFull>
            {#if author}
                <FlexRowWrapper widthFull gap>
                    <FlexRowWrapper baseline>
                        <span class="name">
                            {author.name}
                        </span>
                        {#each author.roles || [] as role}
                            <Role {role} />
                        {/each}
                        <small>
                            {author.metadata?.screen_id || author.id.path.at(-1)}
                        </small>
                    </FlexRowWrapper>
                    {#if createdAt}
                        <span class="time">
                            <Tooltip>
                                {$dateTimeFormats.full.format(createdAt)}
                            </Tooltip>
                            <RelativeDate date={createdAt} />
                        </span>
                    {/if}
                </FlexRowWrapper>
                <FlexRowWrapper widthFull between>
                    <FlexColWrapper>
                        {#if content}
                            <div class="message-content">
                                <ComponentRenderer component={content} />
                            </div>
                        {/if}
                        {#if paid}
                            <div class="paid">
                                {paid.currency}{paid.amount}
                            </div>
                        {/if}
                        {#if gifts?.length}
                            <div>
                                {#each gifts as gift}
                                    <Gift {gift} />
                                {/each}
                            </div>
                        {/if}
                    </FlexColWrapper>
                    {#if selected}
                        <div class="actions">
                            <button on:click={handleCopy}>
                                <Tooltip>{$translate('panels.messages.copy')}</Tooltip>
                                <i class="ti ti-files" />
                            </button>
                        </div>
                    {/if}
                </FlexRowWrapper>
            {:else}
                <FlexRowWrapper widthFull between>
                    <FlexColWrapper>
                        {#if content}
                            <div class="message-content">
                                <ComponentRenderer component={content} />
                            </div>
                        {/if}
                        {#if paid}
                            <div class="paid">
                                {paid.currency}{paid.amount}
                            </div>
                        {/if}
                        {#if gifts?.length}
                            <div>
                                {#each gifts as gift}
                                    <Gift {gift} />
                                {/each}
                            </div>
                        {/if}
                    </FlexColWrapper>
                    {#if createdAt}
                        <span class="time">
                            <Tooltip>
                                {$dateTimeFormats.full.format(createdAt)}
                            </Tooltip>
                            <RelativeDate date={createdAt} />
                        </span>
                    {/if}
                </FlexRowWrapper>
            {/if}
        </FlexColWrapper>
    </FlexRowWrapper>
</article>

<style lang="scss">
    article {
        display: flex;
        flex-direction: row;
        gap: 10px;
        padding: 15px;
        font-weight: 500;
        border-bottom: 1px solid var(--color-bg-1);

        &.selected {
            background: var(--color-bg-1);
            outline: 1px solid var(--color-1);
            outline-offset: -4px;
        }
    }

    .special {
        border-left: 2px solid var(--color-1);
    }

    .author-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
    }

    .author-avatar-preview {
        width: 128px;
        height: 128px;
        outline: 2px solid #000;
    }

    button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        font-size: 1rem;
        color: var(--color-1);
        cursor: pointer;
        background: var(--color-bg-1);
        border: none;
        outline: none;

        &:hover {
            color: var(--color-bg-1);
            background: var(--color-1);
        }

        &:focus {
            outline: 1px solid var(--color-1);
            outline-offset: -1px;
        }
    }

    .name {
        margin-right: 5px;
        white-space: nowrap;
        user-select: text;
        font-weight: 600;
        font-size: 12px;
    }

    small {
        font-size: 0.6rem;
        color: #999;
    }

    .time {
        padding: 2px 0;
        margin-left: auto;
        font-size: 0.8rem;
        color: #666;
        user-select: text;
    }

    .message-content {
        overflow: clip;
        font-size: 0.9rem;
        text-wrap: wrap;
        word-break: auto-phrase;
        overflow-wrap: break-word;
        white-space: pre-line;
        user-select: text;
    }

    .paid {
        width: 100%;
        padding: 2px;
        font-size: 0.8rem;
        font-weight: bold;
        color: var(--color-1);
        user-select: text;
    }

    .actions {
        display: flex;
        align-self: flex-end;
    }
</style>
