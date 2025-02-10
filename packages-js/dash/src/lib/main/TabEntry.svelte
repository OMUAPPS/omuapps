<script lang="ts">
    import { t } from '$lib/i18n/i18n-context.js';
    import { Tooltip } from '@omujs/ui';
    import { type PageItem } from './page.js';
    import { currentPage, menuOpen } from './settings.js';

    export let entry: PageItem<unknown>;

    $: title = $t(`page.${entry.id}.title`);
    $: tooltip = $t(`page.${entry.id}.tooltip`);
    $: icon = $t(`page.${entry.id}.icon`);
</script>

<button
    class="tab"
    on:click={() => ($currentPage = entry.id)}
    class:active={$currentPage === entry.id}
>
    <Tooltip>
        <div class="tooltip">
            {#if $menuOpen}
                {tooltip}
            {:else}
                <p>{title}</p>
                <small>{tooltip}</small>
            {/if}
        </div>
    </Tooltip>
    <i class={icon}></i>
    {#if $menuOpen}
        <span class="title">{title}</span>
        <i class="open ti ti-chevron-right"></i>
    {/if}
</button>

<style lang="scss">
    .tab {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 0 1rem;
        border: none;
        background: var(--color-bg-2);
        color: var(--color-1);
        width: 100%;
        font-size: 0.9rem;
        font-weight: 600;
        height: 3rem;
        margin-bottom: 2px;

        > i {
            font-size: 1rem;
            margin-right: 0.5rem;
        }

        > .open {
            margin-left: auto;
            margin-right: 0.1rem;
            visibility: hidden;
        }

        &:focus-visible,
        &:focus,
        &:hover {
            background: var(--color-bg-1);
            transition: background 0.0621s;
            outline: none;

            > .open {
                visibility: visible;
                margin-right: 0rem;
                transition: margin 0.0621s;
            }
        }

        &.active {
            background: var(--color-bg-1);
            color: var(--color-1);
            border-right: 2px solid var(--color-1);
        }
    }

    .title {
        white-space: nowrap;
    }

    .tooltip {
        display: flex;
        flex-direction: column;
        align-items: start;
        text-wrap: wrap;
    }
</style>
