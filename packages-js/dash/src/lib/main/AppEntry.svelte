<script lang="ts">
    import { omu } from '$lib/client.js';
    import type { App } from '@omujs/omu';
    import { Tooltip } from '@omujs/ui';
    import AppPage from './AppPage.svelte';
    import { loadedIds, page, type PageItem } from './page.js';

    export let entry: App;

    const metadata = entry.metadata;
    const name = metadata?.name ? omu.i18n.translate(metadata?.name) : entry.id.key();
    const description = metadata?.description
        ? omu.i18n.translate(metadata?.description)
        : 'No description';
    const icon = metadata?.icon ? omu.i18n.translate(metadata?.icon) : 'No icon';
    const image = metadata?.image ? omu.i18n.translate(metadata?.image) : null;

    const appPage = {
        id: `app-${entry.id.key()}`,
        async open() {
            return {
                component: AppPage,
                props: {
                    app: entry,
                },
            };
        },
    } as PageItem<unknown>;

    function handleClick() {
        $page = appPage;
    }
</script>

<button
    class="app"
    class:active={$page === appPage}
    class:loaded={$loadedIds.includes(appPage.id)}
    on:click={handleClick}
>
    <Tooltip>
        <div class="tooltip">
            <h3>{name}</h3>
            <small>{description}</small>
        </div>
    </Tooltip>
    {#if image}
        <img src={image} alt="" class="image" />
    {/if}
    <div class="info">
        <span class="icon">
            {#if icon.startsWith('ti-')}
                <i class="ti {icon}"></i>
            {:else}
                <img src={icon} alt={name} />
            {/if}
        </span>
        <p class="name">
            {name}
        </p>
        <div class="open">
            <i class="ti ti-chevron-right" />
        </div>
    </div>
</button>

<style lang="scss">
    .app {
        position: relative;
        display: flex;
        flex-direction: row;
        align-items: center;
        background: var(--color-bg-2);
        border: none;
        border-bottom: 1px solid var(--color-outline);
        width: 100%;
        height: 4rem;

        &.active {
            background: var(--color-bg-1);
            transition: background 0.0621s;
        }

        &.loaded {
            border-left: 2px solid var(--color-1);
        }

        &:focus,
        &:hover {
            outline: 1px solid var(--color-1);
            outline-offset: -3px;
            transition: background 0.0621s;

            > .info {
                margin: 0.1rem;
                transition: margin 0.0621s;

                > .open {
                    display: block;
                    margin-right: 0rem;
                    transition: margin 0.0621s;
                }
            }
        }

        .tooltip {
            display: flex;
            flex-direction: column;
            align-items: start;
            text-wrap: wrap;
            text-align: start;
            padding: 0.1rem;

            > h3 {
                font-size: 0.9rem;
                font-weight: 600;
                color: var(--color-text-1);
                width: 100%;
            }

            > small {
                font-size: 0.621rem;
                color: var(--color-text-2);
            }
        }

        > .image {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 0.5;
        }

        > .info {
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: row;
            align-items: center;
            padding: 1rem;
            width: 100%;
            color: var(--color-1);

            > .icon {
                display: flex;
                justify-content: center;
                align-items: center;
                width: 2rem;
                height: 2rem;
                margin-right: 0.25rem;
                background: var(--color-bg-3);

                > img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }

                > .ti {
                    font-size: 1.25rem;
                }
            }

            > .name {
                font-size: 0.8rem;
                font-weight: 600;
                color: var(--color-text-1);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            > .open {
                display: none;
                margin-left: auto;
                margin-right: 0.1rem;
                min-width: 2rem;
                height: 2rem;
                color: var(--color-1);
                background: none;
                border: none;
            }
        }
    }
</style>
