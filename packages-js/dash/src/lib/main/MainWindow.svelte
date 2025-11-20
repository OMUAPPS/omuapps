<script lang="ts">
    import { chat, omu } from '$lib/client.js';
    import { t } from '$lib/i18n/i18n-context.js';
    import { screenContext } from '$lib/screen/screen.js';
    import type { App } from '@omujs/omu';
    import { ButtonMini, TableList, Tooltip } from '@omujs/ui';
    import { onMount } from 'svelte';
    import AppEntry from './AppEntry.svelte';
    import {
        pageMap,
        pages,
        registerPage,
        unregisterPage,
        type Page,
        type PageItem,
    } from './page.js';
    import AppPage from './pages/AppPage.svelte';
    import ConnectPage from './pages/ConnectPage.svelte';
    import ExplorePage from './pages/ExplorePage.svelte';
    import ManageAppsScreen from './screen/ManageAppsScreen.svelte';
    import { currentPage, devMode, menuOpen } from './settings.js';
    import SettingsPage from './settings/SettingsPage.svelte';
    import TabEntry from './TabEntry.svelte';

    const EXPLORE_PAGE = registerPage({
        id: 'explore',
        async open() {
            return {
                component: ExplorePage,
                props: {},
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

    async function loadPage(id: string, pageItem: PageItem<unknown>) {
        if ($pages[id] && $pages[id].type === 'loaded') return;
        $pages[id] = { type: 'loading' };
        console.log('loading', id);
        const page = await pageItem.open();
        $pages[id] = { type: 'loaded', page };
        console.log('loaded', id);
    }

    currentPage.subscribe(async (value) => {
        const pageItem = $pageMap[value];
        if (!pageItem) {
            $pages[value] = { type: 'waiting' };
            console.log('waiting', value);
            return;
        }
        await loadPage(value, pageItem);
    });
    pageMap.subscribe(async (value) => {
        const page = $pages[$currentPage];
        if (!page || page.type !== 'waiting') return;
        if (!value[$currentPage]) return;
        const pageItem = value[$currentPage];
        await loadPage($currentPage, pageItem);
    });

    async function registerServicePages() {
        omu.server.apps.listen();
        const update = async (apps: Map<string, App>) => {
            const services = [...apps.values().filter((app) => app.type === 'service')];
            for (const service of services) {
                const id = `app-${service.id.key()}`;
                $pages[id] = {
                    type: 'loaded', page: {
                        component: AppPage,
                        props: {
                            app: service,
                        },
                    } as Page<unknown>,
                };
            }
        };
        omu.server.apps.event.cacheUpdate.listen((newApps) => update(newApps));
        update(await omu.server.apps.fetchAll());
    }

    let onlineChats = 0;

    onMount(async () => {
        omu.server.apps.event.remove.listen((removedItems) => {
            removedItems.forEach((item) => {
                delete $pages[`app-${item.id.key()}`];
                unregisterPage(`app-${item.id.key()}`);
            });
        });

        function updateOnlineChats() {
            onlineChats = chat.rooms.cache.values().filter((room) => room.connected).toArray().length;
        }

        chat.rooms.listen(() => updateOnlineChats());
        await chat.rooms.fetchItems({
            limit: 10,
            backward: true,
        });
        updateOnlineChats();
        registerServicePages();
    });
    $: console.log($pages);
</script>

<main class:open={$menuOpen}>
    <div class="tabs" class:open={$menuOpen}>
        <section>
            <button class="menu" onclick={() => ($menuOpen = !$menuOpen)}>
                {#if $menuOpen}
                    <i class="ti ti-chevron-left"></i>
                    <Tooltip>{$t('menu.collapse')}</Tooltip>
                {:else}
                    <i class="ti ti-menu"></i>
                    <Tooltip>{$t('menu.expand')}</Tooltip>
                {/if}
            </button>
            <TabEntry entry={EXPLORE_PAGE} />
            <TabEntry entry={CONNECT_PAGE} badge={onlineChats ? `${onlineChats}` : undefined} />
            <TabEntry entry={SETTINGS_PAGE} />
            <div class="tab-group">
                {#if $menuOpen}
                    <span class="title">
                        {$t('menu.apps')}
                        <i class="ti ti-apps"></i>
                    </span>
                    <div class="buttons">
                        <ButtonMini
                            onclick={() =>
                                screenContext.push(ManageAppsScreen, undefined)}
                        >
                            <Tooltip>
                                <div class="tooltip">
                                    <h3>{$t('screen.manage-apps.name')}</h3>
                                    <small
                                    >{$t(
                                        'screen.manage-apps.description',
                                    )}</small
                                    >
                                </div>
                            </Tooltip>
                            <i class="ti ti-edit"></i>
                        </ButtonMini>
                    </div>
                {/if}
            </div>
        </section>
        <div class="list">
            <TableList table={omu.server.apps} filter={(_, app) => !!app.url && !app.parentId && ($devMode || app.type === 'app')} component={AppEntry}>
                <button
                    onclick={() => ($currentPage = EXPLORE_PAGE.id)}
                    slot="empty"
                    class="no-apps"
                >
                    {#if $menuOpen}
                        {#if $currentPage === EXPLORE_PAGE.id}
                            <p>
                                {$t('menu.jump-to-explore-hint')}
                            </p>
                            <small>
                                {$t('menu.add-apps-hint')}
                            </small>
                        {:else}
                            <p>
                                {$t('menu.add-apps')}
                                <i class="ti ti-external-link"></i>
                            </p>
                            <small>
                                {$t('menu.jump-to-explore')}
                            </small>
                        {/if}
                    {/if}
                </button>
            </TableList>
        </div>
    </div>
    <div class="page-container">
        {#each Object.entries($pages) as [id, entry] (id)}
            {#key id}
                {#if entry.type === 'loaded'}
                    <div class="page" class:visible={$currentPage === id}>
                        <svelte:component
                            this={entry.page.component}
                            props={entry.page.props}
                        />
                    </div>
                {/if}
            {/key}
        {/each}
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
        padding: 0.5rem 0;
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
            font-size: 0.9rem;
        }
    }

    .no-apps {
        display: flex;
        flex-direction: column;
        justify-content: center;
        width: calc(100% - 2rem);
        margin: 0 1rem;
        padding: 1rem 1rem;
        border: 1px dashed var(--color-outline);
        font-size: 1rem;
        font-weight: 600;
        border-radius: 2px;
        background: var(--color-bg-2);
        color: var(--color-1);
        cursor: pointer;

        > small {
            color: var(--color-text);
            font-weight: 600;
            font-size: 0.7rem;
        }

        &:focus-visible,
        &:hover {
            outline: none;
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
