<script lang="ts">
    import { omu } from '$lib/client.js';
    import { t } from '$lib/i18n/i18n-context.js';
    import type { App } from '@omujs/omu';
    import { ButtonMini, Tooltip } from '@omujs/ui';
    import { pages } from '../../main/page.js';
    import { currentPage } from '../../settings.js';
    import { selectedApp } from './stores.js';

    interface Props {
        entry: App;
    }

    let { entry }: Props = $props();
    let name = $derived(entry.metadata?.name
        ? omu.i18n.translate(entry.metadata?.name)
        : '');
    let description = $derived(entry.metadata?.description
        ? omu.i18n.translate(entry.metadata?.description)
        : '');
    let icon = $derived(entry.metadata?.icon
        ? omu.i18n.translate(entry.metadata?.icon)
        : 'ti-box');

    let id = $derived(`app-${entry.id.key()}`);
</script>

<button onclick={() => {
    $selectedApp = entry;
}}>
    {#if $currentPage === id}
        <div class="current">
            <Tooltip>
                <span>{$t('general.current')}</span>
            </Tooltip>
            <i class="ti ti-check"></i>
        </div>
    {/if}
    <div class="icon">
        {#if icon}
            {#if icon.startsWith('ti')}
                <i class="ti {icon}"></i>
            {:else}
                <img src={icon} alt="" />
            {/if}
        {:else}
            <i class="ti ti-package"></i>
        {/if}
    </div>
    <div class="info">
        <Tooltip>
            {entry.id.key()}
        </Tooltip>
        <p class="name">
            {name}
        </p>
        <p class="description">
            {description || $t('general.no_description')}
        </p>
    </div>
    <div class="actions">
        <ButtonMini primary onclick={() => omu.server.apps.remove(entry)}>
            <Tooltip>
                <span>{$t('general.delete')}</span>
            </Tooltip>
            <i class="ti ti-trash"></i>
        </ButtonMini>
        <ButtonMini primary onclick={() => {
            const id = `app-${entry.id.key()}`;
            delete $pages[id];
            $currentPage = 'explore';
            $currentPage = id;
        }}>
            <Tooltip>
                <span>{$t('general.reload')}</span>
            </Tooltip>
            <i class="ti ti-reload"></i>
        </ButtonMini>
    </div>
</button>

<style lang="scss">
    button {
        position: relative;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem 1rem;
        border-bottom: 1px solid var(--color-outline);
        margin-bottom: 4px;
        background: var(--color-bg-1);
        border: none;
        cursor: pointer;
        width: 100%;
        height: 4rem;
        white-space: nowrap;
        text-align: left;

        &:hover {
            background: var(--color-bg-1);
            outline: 1px solid var(--color-1);
            outline-offset: -3px;
            transition: padding-left 0.02621s;
        }
    }

    .current {
        position: absolute;
        top: 1rem;
        left: 2rem;
        background: var(--color-1);
        color: var(--color-bg-1);
        width: 1rem;
        height: 1rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .icon {
        width: 2rem;
        min-width: 2rem;
        height: 2rem;
        min-height: 2rem;
        margin-right: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;

        > img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        > i {
            font-size: 1.5rem;
            color: var(--color-1);
        }
    }

    .actions {
        position: absolute;
        right: 1rem;
        display: flex;
        gap: 0.5rem;
    }

    .info {
        flex: 1;
    }

    .name {
        flex: 1;
        font-weight: bold;
        color: var(--color-1);
        font-size: 1rem;
    }

    .description {
        color: var(--color-text);
        font-size: 0.65rem;
        font-weight: bold;
    }
</style>
