<script lang="ts">
    import { dashboard, omu } from '$lib/client.js';
    import { t } from '$lib/i18n/i18n-context.js';
    import type { App } from '@omujs/omu';
    import { Tooltip } from '@omujs/ui';

    export let entry: App;
    const name = entry.metadata?.name
        ? omu.i18n.translate(entry.metadata?.name)
        : ''
    const description = entry.metadata?.description
        ? omu.i18n.translate(entry.metadata?.description)
        : ''
    const icon = entry.metadata?.icon
        ? omu.i18n.translate(entry.metadata?.icon)
        : ''
</script>

<li>
    <div class="icon">
        {#if icon}
            {#if icon.startsWith('ti')}
                <i class="ti {icon}" />
            {:else}
                <img src={icon} alt="" />
            {/if}
        {:else}
            <i class="ti ti-package" />
        {/if}
    </div>
    <div>
        <p class="name">
            {name}
        </p>
        <p class="description">
            {description}
        </p>
    </div>
    <span class="id">
        {entry.id.key()}
    </span>
    <button on:click={() => dashboard.apps.remove(entry)} class="delete">
        <Tooltip>
            <span>{$t('general.delete')}</span>
        </Tooltip>
        <i class="ti ti-trash" />
    </button>
</li>

<style lang="scss">
    li {
        display: flex;
        align-items: center;
        padding: 1rem 0.5rem;
        padding-left: 0.5rem;
        border-bottom: 1px solid var(--color-outline);

        &:hover {
            background: var(--color-bg-1);
            transition: padding-left 0.02621s;
        }
    }

    button {
        background: none;
        border: none;
        cursor: pointer;
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

    .id {
        margin-left: auto;
        color: var(--color-text);
        opacity: 0.5;
        font-size: 0.65rem;
    }

    .delete {
        background: var(--color-bg-1);
        color: var(--color-1);
        width: 2rem;
        height: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-left: 0.5rem;

        &:hover {
            background: var(--color-1);
            color: var(--color-bg-1);
        }
    }
</style>
