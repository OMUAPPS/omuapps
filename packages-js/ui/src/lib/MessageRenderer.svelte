<script lang="ts">
    import type { Content, Models } from '@omujs/chat';
    import ButtonLink from './ButtonLink.svelte';
    import ButtonMini from './ButtonMini.svelte';
    import ComponentRenderer from './ComponentRenderer.svelte';
    import ExternalLink from './ExternalLink.svelte';
    import Gift from './Gift.svelte';
    import RelativeDate from './RelativeDate.svelte';
    import Role from './Role.svelte';
    import Tooltip from './Tooltip.svelte';
    import { client, dateTimeFormats, translate } from './stores.js';
    import { applyOpacity } from './utils/class-helper.js';

    export let paid: Models.Paid | undefined = undefined;
    export let gifts: Array<Models.Gift> | undefined = undefined;
    export let author: Models.Author | undefined = undefined;
    export let room: Models.Room | undefined = undefined;
    export let createdAt: Date | undefined = undefined;
    export let content: Content.Component | undefined = undefined;
    export let handleCopy: () => void = () => {};
    export let selected: boolean = false;

    $: roomStartedAt =
        room?.metadata.started_at && new Date(room.metadata.started_at);
    $: time =
        (createdAt &&
            roomStartedAt &&
            new Date(createdAt.getTime() - roomStartedAt.getTime())) ||
        null;
    $: url = room?.metadata.url || null;

    function formatTime(date: Date): string {
        const parts: string[] = [];
        const seconds = Math.floor(date.getTime() / 1000);
        if (seconds > 60 * 60 * 24 * 30) {
            parts.push(Math.floor(seconds / 60 / 60 / 24 / 30) + '/');
        }
        if (seconds > 60 * 60 * 24) {
            parts.push((Math.floor(seconds / 60 / 60 / 24) % 30) + ' ');
        }
        if (seconds > 60 * 60) {
            parts.push((Math.floor(seconds / 60 / 60) % 24) + 'h ');
        }
        parts.push(date.getMinutes().toString().padStart(2, '0') + 'm ');
        parts.push(date.getSeconds().toString().padStart(2, '0') + 's');
        return parts.join('');
    }

    const CURRENCIES: Record<string, string | undefined> = {
        '¥': 'yen',
        '฿': 'baht',
        '$': 'dollar',
        '€': 'euro',
        '£': 'pound',
        '₩': 'won',
        '₹': 'rupee',
        '₽': 'ruble',
        '₣': 'franc',
        'R$': 'real',
        '₺': 'lira',
        '₱': 'peso',
        'RM': 'ringgit',
    };
</script>

<article
    class:special={!!(paid || gifts?.length)}
    class:selected
    style:background={paid || gifts?.length
        ? applyOpacity(paid ? 'var(--color-1)' : 'var(--color-2)', 0.1)
        : undefined}
>
    {#if author && author.avatarUrl}
        {@const proxyUrl = $client.assets.proxy(author.avatarUrl)}
        <div class="avatar">
            <Tooltip noBackground>
                {@const fullProxyUrl = $client.assets.proxy(author.metadata.avatar_url ?? author.avatarUrl)}
                <img src={fullProxyUrl} alt="avatar" class="avatar-preview" />
            </Tooltip>
            {#if author.metadata?.url}
                <ExternalLink href={author.metadata.url}>
                    <img src={proxyUrl} alt="avatar" class="avatar-image" />
                </ExternalLink>
            {:else}
                <img src={proxyUrl} alt="avatar" class="avatar-image" />
            {/if}
        </div>
    {/if}
    <div class="message">
        {#if author}
            <div class="author-info">
                <div class="author">
                    <span>{author.name}</span>
                    {#each author.roles || [] as role (role.id)}
                        <Role {role} />
                    {/each}
                    <small
                    >{author.metadata?.screen_id ||
                        author.id.path.at(-1)}</small
                    >
                </div>
                {#if createdAt}
                    <span class="time">
                        <Tooltip>
                            {$dateTimeFormats.full.format(createdAt)}
                        </Tooltip>
                        <RelativeDate date={createdAt} />
                    </span>
                {/if}
            </div>
        {/if}
        <div class="flex width between">
            <div class="content">
                {#if content}
                    <div class="content-renderer">
                        <ComponentRenderer component={content} />
                    </div>
                {/if}
                {#if gifts?.length}
                    <div class="gifts">
                        {#if paid}
                            {@const currency = CURRENCIES[paid.currency]}
                            <div class="paid">
                                <span>
                                    <i class="ti ti-gift"></i>
                                    {$translate('panels.messages.paid')}
                                </span>
                                <p>
                                    {#if currency}
                                        <i class="ti ti-{currency}"></i>
                                    {:else}
                                        {paid.currency}
                                    {/if}
                                    {paid.amount}
                                </p>
                            </div>
                        {/if}
                        {#each gifts as gift, i (i)}
                            <Gift {gift} />
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    </div>
    {#if selected}
        <div class="actions">
            {#if time}
                {@const timedLink = `${url}&t=${Math.floor(time.getTime() / 1000) + 10}s`}
                <ButtonLink
                    href={timedLink}
                    primary
                >
                    <Tooltip>
                        <p>{$translate('panels.messages.see_in_room')}</p>
                        <p>{formatTime(time)}</p>
                    </Tooltip>
                    <i class="ti ti-external-link"></i>
                </ButtonLink>
            {/if}
            <ButtonMini primary on:click={handleCopy}>
                <Tooltip>{$translate('panels.messages.copy')}</Tooltip>
                <i class="ti ti-files"></i>
            </ButtonMini>
        </div>
    {/if}
</article>

<style lang="scss">
    article {
        display: flex;
        flex-direction: row;
        padding: 1rem;
        font-weight: 500;
        border-bottom: 1px solid var(--color-bg-1);
        gap: 0.5rem;
        flex: 1;

        &.selected {
            background: var(--color-bg-1);
            outline: 1px solid var(--color-1);
            outline-offset: -4px;
        }
    }

    .special {
        border-left: 2px solid var(--color-1);
    }

    .avatar {
        display: flex;
        flex-direction: column;
        height: fit-content;
    }

    .avatar-image {
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
    }

    .avatar-preview {
        width: 8rem;
        height: 8rem;
        outline: 2px solid #000;
    }

    .message {
        display: flex;
        flex-direction: column;
        flex: 1;
    }

    .author-info {
        display: flex;
        flex-direction: row;
        gap: 0.5rem;
        align-items: center;
        justify-content: space-between;
    }

    .author {
        display: flex;
        align-items: center;

        > span {
            margin-right: 0.5rem;
            user-select: text;
            font-weight: 600;
            font-size: 0.8rem;
            display: -webkit-box;
            line-clamp: 1;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
            flex: 1;
            height: 1.2rem;
        }

        > small {
            font-size: 0.6rem;
            color: #999;
            white-space: nowrap;
        }
    }

    .time {
        padding: 0.1rem 0;
        font-size: 0.8rem;
        color: #666;
        user-select: text;
        white-space: nowrap;
    }

    .content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        flex: 1;
    }

    .content-renderer {
        overflow: clip;
        font-size: 0.9rem;
        text-wrap: wrap;
        word-break: auto-phrase;
        overflow-wrap: break-word;
        white-space: pre-line;
        user-select: text;
    }

    .gifts {
        display: flex;
        flex-direction: row;
        gap: 0.5rem;
        font-size: 0.8rem;
        font-weight: bold;
        color: var(--color-1);
        user-select: text;
        border-top: 1px solid var(--color-outline);
        padding-top: 0.5rem;
    }

    .paid {
        padding: 1rem 0;
        font-size: 0.8rem;
        font-weight: bold;
        color: var(--color-1);
        user-select: text;
        width: 4rem;
        height: 4rem;
        white-space: nowrap;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;

        > span {
            font-size: 1rem;
        }
    }

    .actions {
        display: flex;
        gap: 2px;
    }

    .flex {
        display: flex;
    }

    .width {
        width: 100%;
    }

    .between {
        justify-content: space-between;
    }
</style>
