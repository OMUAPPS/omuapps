<script lang="ts">
    import type { models } from '@omujs/chat';
    import { writable } from 'svelte/store';

    import { t } from '$lib/i18n/i18n-context.js';

    import { chat, omu } from '$lib/client.js';
    import ProviderIcon from '$lib/common/ProviderIcon.svelte';
    import { ButtonMini, Checkbox, Tooltip } from '@omujs/ui';

    export let entry: models.Channel;
    export let selected: boolean = false;

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
    <div class="left">
        <div class="channel-icon">
            {#if entry.iconUrl}
                <img src={omu.assets.proxy(entry.iconUrl)} alt="icon" />
                <Tooltip>
                    <img src={omu.assets.proxy(entry.iconUrl)} alt="icon" class="tooltip-image" />
                </Tooltip>
            {:else}
                <ProviderIcon providerId={entry.providerId} />
            {/if}
        </div>
        <div class="description">
            <div class="channel-name">{entry.name || entry.providerId}</div>
            <small class="channel-url">
                {entry.url}
            </small>
        </div>
    </div>
    <div class="right">
        {#if selected}
            <ButtonMini on:click={remove}>
                <Tooltip>
                    <div class="description">{$t('panels.channels.delete')}</div>
                </Tooltip>
                <i class="ti ti-trash" />
            </ButtonMini>
            <ButtonMini>
                <Tooltip>
                    <div class="description">{$t('panels.channels.edit')}</div>
                </Tooltip>
                <i class="ti ti-settings" />
            </ButtonMini>
            <a href={entry.url} target="_blank">
                <ButtonMini>
                    <Tooltip>
                        <div class="description">{$t('panels.channels.open')}</div>
                    </Tooltip>
                    <i class="ti ti-external-link" />
                </ButtonMini>
            </a>
        {:else}
            <small>{$t('panels.channels.connect')}</small>
        {/if}
        <Checkbox bind:value={$active} />
    </div>
</div>

<style lang="scss">
    .entry {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        min-height: 60px;
        padding: 10px;
        padding-left: 10px;

        &:active,
        &.selected {
            background: var(--color-bg-1);
            outline: 1px solid var(--color-1);
            outline-offset: -4px;
        }
    }

    .left {
        display: flex;
        flex-direction: row;
        gap: 10px;
        align-items: center;
    }

    .right {
        display: flex;
        flex-direction: row;
        align-items: center;
    }

    .channel-icon {
        width: 32px;
        height: 32px;
        margin: 5px;
        border-radius: 50%;

        img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
        }

        .tooltip-image {
            width: 200px;
            height: 200px;
            padding: 0;
            margin: 0;
            border-radius: 0;
        }
    }

    .channel-name {
        font-size: 1rem;
        opacity: 1;
    }

    small {
        font-size: 0.8rem;
        color: var(--color-1);
    }

    a {
        text-decoration: none;
    }
</style>
