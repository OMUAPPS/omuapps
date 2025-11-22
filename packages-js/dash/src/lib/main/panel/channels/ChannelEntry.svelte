<script lang="ts">
    import type { Models } from '@omujs/chat';
    import { writable } from 'svelte/store';

    import { t } from '$lib/i18n/i18n-context.js';

    import { chat, omu } from '$lib/client.js';
    import { ButtonLink, ButtonMini, Checkbox, Tooltip } from '@omujs/ui';

    interface Props {
        entry: Models.Channel;
        selected?: boolean;
    }

    let { entry = $bindable(), selected = false }: Props = $props();

    let active = writable(entry.active);
    active.subscribe((value) => {
        if (value === entry.active) return;
        entry.active = value;
        chat.channels.update(entry);
    });

    function remove() {
        chat.channels.remove(entry);
    }
</script>

<div class="entry" class:selected>
    <div class="channel-icon">
        {#if entry.iconUrl}
            <img src={omu.assets.proxy(entry.iconUrl)} alt="icon" />
            <Tooltip>
                <img src={omu.assets.proxy(entry.iconUrl)} alt="icon" class="tooltip-image" />
            </Tooltip>
        {:else}
            <i class="ti ti-user"></i>
        {/if}
    </div>
    <div class="info">
        <p>{entry.name || entry.providerId}</p>
        <small>{entry.url}</small>
    </div>
    <div class="actions">
        {#if selected}
            <ButtonMini onclick={remove}>
                <Tooltip>
                    <div>{$t('panels.channels.delete')}</div>
                </Tooltip>
                <i class="ti ti-trash"></i>
            </ButtonMini>
            <ButtonLink href={entry.url}>
                <Tooltip>
                    <div>{$t('panels.channels.open')}</div>
                </Tooltip>
                <i class="ti ti-external-link"></i>
            </ButtonLink>
        {:else}
            <small>{$t('panels.channels.connect')}</small>
        {/if}
        <span>
            <Tooltip>
                <div>{$t('panels.channels.active')}</div>
            </Tooltip>
            <Checkbox bind:value={$active} />
        </span>
    </div>
</div>

<style lang="scss">
    .entry {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 0.5rem 1rem;
        padding-left: 1rem;

        &:active,
        &.selected {
            background: var(--color-bg-1);
            outline: 1px solid var(--color-1);
            outline-offset: -4px;
        }
    }

    .actions {
        display: flex;
        flex-direction: row;
        align-items: center;
        margin-left: auto;
        white-space: nowrap;
        gap: 0.25rem;
    }

    .channel-icon {
        min-width: 2rem;
        min-height: 2rem;
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        margin-right: 1rem;

        img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
        }

    }

    .tooltip-image {
        max-width: 200px;
        max-height: 200px;
        object-fit: contain;
        padding: 0;
        margin: 0;
        border-radius: 0;
    }

    .info {
        position: relative;
        display: flex;
        flex-direction: column;
        flex: 1;
        height: 2.25rem;

        > p {
            position: absolute;
            top: 0;
            font-size: 0.9rem;
            color: var(--color-1);
            width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        > small {
            position: absolute;
            bottom: 0;
            font-size: 0.621rem;
            color: var(--color-text);
            width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    }
</style>
