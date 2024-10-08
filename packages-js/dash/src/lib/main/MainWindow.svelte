<script lang="ts">
    import { dashboard } from '$lib/client.js';
    import { t } from '$lib/i18n/i18n-context.js';
    import { screenContext } from '$lib/screen/screen.js';
    import { TableList, Tooltip } from '@omujs/ui';
    import { DEV } from 'esm-env';
    import AppEntry from './AppEntry.svelte';
    import {
        loadedIds,
        pageMap,
        registerPage,
        type Page,
        type PageItem,
    } from './page.js';
    import ConnectPage from './pages/ConnectPage.svelte';
    import IframePage from './pages/IframePage.svelte';
    import ManageAppsScreen from './screen/ManageAppsScreen.svelte';
    import { currentPage, menuOpen } from './settings.js';
    import SettingsPage from './settings/SettingsPage.svelte';
    import TabEntry from './TabEntry.svelte';

    const EXPLORE_PAGE = registerPage({
        id: 'explore',
        async open() {
            return {
                component: IframePage,
                props: {
                    url: DEV
                        ? 'http://localhost:5173/app/'
                        : 'https://omuapps.com/app/',
                },
            } as Page<unknown>;
        },
    });

    const CONNECT_PAGE = registerPage({
        id: 'connect',
        async open() {
            return {
                component: ConnectPage,
                props: {},
            } as Page<unknown>;
        },
    });

    const SETTINGS_PAGE = registerPage({
        id: 'settings',
        async open() {
            return {
                component: SettingsPage,
                props: {},
            } as Page<unknown>;
        },
    });

    const pages: Map<string, Page<unknown>> = new Map();
    let loading = false;

    async function loadPage(
        pageMap: Record<string, PageItem<unknown>>,
        id: string,
    ): Promise<Page<unknown> | undefined> {
        loading = true;
        const pageItem = pageMap[id];
        if (pageItem) {
            loading = true;
            const page = await pageItem.open();
            pages.set(pageItem.id, page);
            loading = false;
            return page;
        }
        loading = false;
        return undefined;
    }

    currentPage.subscribe((id) => {
        if (!$loadedIds.includes(id)) {
            $loadedIds = [...$loadedIds, id];
        }
    });
</script>

<main class:open={$menuOpen}>
    <div class="tabs" class:open={$menuOpen}>
        <section>
            <button class="menu" on:click={() => ($menuOpen = !$menuOpen)}>
                {#if $menuOpen}
                    <i class="ti ti-chevron-left" />
                    <Tooltip>{$t('menu.collapse')}</Tooltip>
                {:else}
                    <i class="ti ti-menu" />
                    <Tooltip>{$t('menu.expand')}</Tooltip>
                {/if}
            </button>
            <TabEntry entry={EXPLORE_PAGE} />
            <TabEntry entry={CONNECT_PAGE} />
            <TabEntry entry={SETTINGS_PAGE} />
            <div class="tab-group">
                {#if $menuOpen}
                    <span class="title">
                        {$t('menu.apps')}
                        <i class="ti ti-apps" />
                    </span>
                    <div class="buttons">
                        <button
                            on:click={() =>
                                screenContext.push(ManageAppsScreen, undefined)}
                        >
                            <Tooltip>
                                <div class="tooltip">
                                    <h3>{$t('screen.manage-apps.name')}</h3>
                                    <small>{$t('screen.manage-apps.description')}</small>
                                </div>
                            </Tooltip>
                            <i class="ti ti-edit" />
                        </button>
                    </div>
                {/if}
            </div>
        </section>
        <div class="list">
            <TableList table={dashboard.apps} component={AppEntry}>
                <button slot="empty" on:click={() => ($currentPage = EXPLORE_PAGE.id)} class="no-apps">
                    {#if $menuOpen}
                        {#if $currentPage === EXPLORE_PAGE.id}
                            <p>
                                {$t('menu.jump-to-explore-hint')}
                                <i class="ti ti-arrow-right" />
                            </p>
                            <small>
                                {$t('menu.add-apps-hint')}
                            </small>
                        {:else}
                            <p>
                                {$t('menu.add-apps')}
                                <i class="ti ti-plus" />
                            </p>
                            <small>
                                <i class="ti ti-arrow-right" />
                                {$t('menu.jump-to-explore')}
                            </small>
                        {/if}
                    {/if}
                </button>
            </TableList>
        </div>
    </div>
    <div class="page-container">
        {#each Object.keys($pageMap).filter((id) => $loadedIds.includes(id)) as id (id)}
            <div class="page" class:visible={!loading && $currentPage === id}>
                {#await loadPage($pageMap, id)}
                    <div>Loading...</div>
                {:then page}
                    {#if page}
                        <svelte:component
                            this={page.component}
                            props={page.props}
                        />
                    {/if}
                {:catch error}
                    <div>{error.message}</div>
                {/await}
            </div>
        {/each}
        {#if loading}
            <div>Loading...</div>
        {/if}
    </div>
</main>

<style lang="scss">
    $tab-width: 18rem;

    i {
        pointer-events: none;
    }

    .tabs {
        display: flex;
        flex-direction: column;
        width: $tab-width;
        background: var(--color-bg-2);
        border-right: 1px solid var(--color-outline);
        padding: 1rem 0;
        padding-bottom: 0.5rem;
        width: 4rem;
        transition: width 0.0621s;

        &.open {
            width: $tab-width;
            transition: width 0.0621s;
        }

        > section {
            padding: 0 0.5rem;
        }
    }

    .menu {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: end;
        padding: 1rem;
        border: none;
        background: var(--color-bg-2);
        color: var(--color-1);
        width: 100%;
        font-size: 0.9rem;
        font-weight: 600;
        height: 3rem;
        margin-bottom: 1rem;

        > i {
            font-size: 1rem;
        }

        &:focus-visible,
        &:hover {
            outline: none;
            background: var(--color-bg-1);
            transition: background 0.0621s;
        }
    }

    .list {
        display: flex;
        flex-direction: column;
        background: var(--color-bg-2);
        color: var(--color-1);
        width: 100%;
        flex: 1;
        font-size: 0.85rem;
        margin-top: 1rem;
        overflow-y: auto;
    }

    .tab-group {
        display: flex;
        flex-direction: row;
        align-items: baseline;
        padding: 0.5rem 0rem;
        background: var(--color-bg-2);
        color: var(--color-1);
        border-bottom: 1px solid var(--color-outline);
        width: 100%;
        font-size: 0.85rem;
        padding-bottom: 0.75rem;
        margin-top: 2rem;
        padding-left: 0.75rem;

        > .title {
            white-space: nowrap;
        }

        > .buttons {
            margin-left: auto;

            > button {
                background: none;
                border: none;
                color: var(--color-1);
                font-size: 1rem;
                font-weight: 600;
                width: 2rem;
                height: 2rem;

                &:focus-visible,
                &:hover {
                    outline: none;
                    background: var(--color-1);
                    color: var(--color-bg-1);
                    border-radius: 4px;
                }
            }
        }
    }

    .no-apps {
        display: flex;
        flex-direction: column;
        justify-content: center;
        background: var(--color-bg-2);
        color: var(--color-1);
        border: none;
        padding: 0.5rem 1rem;
        width: 100%;

        > p {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            font-weight: 600;

            > i {
                margin-left: 0.5rem;
            }
        }

        &:hover {
            background: var(--color-bg-1);
            transition: background 0.0621s;
        }
    }

    .page-container {
        position: relative;
        flex: 1;
        background: var(--color-bg-1);
    }

    .page {
        position: absolute;
        width: 100%;
        height: 100%;
        display: none;
        background: var(--color-bg-1);
        z-index: 1;

        &.visible {
            display: block;
        }
    }

    main {
        display: flex;
        flex-direction: row;
        height: 100%;
        background: var(--color-bg-1);
        font-weight: 600;
    }
</style>
