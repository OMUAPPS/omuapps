<script lang="ts">
    import type { Models } from '@omujs/chat';
    import { writable } from 'svelte/store';

    import { t } from '$lib/i18n/i18n-context.js';

    import { chat, omu } from '$lib/client.js';
    import { ButtonMini, Checkbox, Tooltip } from '@omujs/ui';

    export let entry: Models.Channel;
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
                <i class="ti ti-user"></i>
            {/if}
        </div>
        <div class="info">
            <div class="name">{entry.name || entry.providerId}</div>
            <small class="url">
                {entry.url}
            </small>
        </div>
    </div>
    <div class="right">
        {#if selected}
            <ButtonMini on:click={remove}>
                <Tooltip>
                    <div>{$t('panels.channels.delete')}</div>
                </Tooltip>
                <i class="ti ti-trash"></i>
            </ButtonMini>
            <a href={entry.url} target="_blank">
                <ButtonMini>
                    <Tooltip>
                        <div>{$t('panels.channels.open')}</div>
                    </Tooltip>
                    <i class="ti ti-external-link"></i>
                </ButtonMini>
            </a>
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
        justify-content: space-between;
        padding: 0.5rem 1rem;
        padding-left: 1rem;

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
        gap: 1rem;
        align-items: center;
    }

    .right {
        display: flex;
        flex-direction: row;
        align-items: center;
    }

    .channel-icon {
        width: 2rem;
        height: 2rem;
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

    .info {
        display: flex;
        flex-direction: column;
    }

    .name {
        font-size: 0.9rem;
        opacity: 1;
        color: var(--color-1);
    }

    .url {
        font-size: 0.621rem;
        color: var(--color-text);
    }

    a {
        text-decoration: none;
    }
</style>
