<script lang="ts">
    import { dashboard, omu } from '$lib/client.js';
    import { t } from '$lib/i18n/i18n-context.js';
    import type { App } from '@omujs/omu';
    import { ButtonMini, Tooltip } from '@omujs/ui';
    import { pages } from '../page.js';
    import { currentPage } from '../settings.js';

    export let entry: App;
    $: name = entry.metadata?.name
        ? omu.i18n.translate(entry.metadata?.name)
        : '';
    $: description = entry.metadata?.description
        ? omu.i18n.translate(entry.metadata?.description)
        : '';
    $: icon = entry.metadata?.icon
        ? omu.i18n.translate(entry.metadata?.icon)
        : '';

    $: id = `app-${entry.id.key()}`;
</script>

<li>
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
    <ButtonMini primary on:click={() => dashboard.apps.remove(entry)}>
        <Tooltip>
            <span>{$t('general.delete')}</span>
        </Tooltip>
        <i class="ti ti-trash"></i>
    </ButtonMini>
    <ButtonMini primary on:click={() => {
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
</li>

<style lang="scss">
    li {
        position: relative;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem 0.5rem;
        padding-left: 0.5rem;
        border-bottom: 1px solid var(--color-outline);

        &:hover {
            background: var(--color-bg-1);
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
        height: 2rem;
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
