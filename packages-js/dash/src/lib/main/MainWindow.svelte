<script lang="ts">

    import { chat, omu } from '$lib/client.js';
    import { t } from '$lib/i18n/i18n-context.js';
    import PageSettings from '$lib/pages/settings/PageSettings.svelte';
    import type { App } from '@omujs/omu';
    import { ButtonMini, TableList, Tooltip } from '@omujs/ui';
    import { onMount } from 'svelte';
    import AppPage from '../pages/PageApp.svelte';
    import ConnectPage from '../pages/PageConnect.svelte';
    import ExplorePage from '../pages/PageExplore.svelte';
    import { currentPage, devMode, lastApp, managingApps, menuOpen } from '../settings.js';
    import {
        pages,
        registerPage,
        unregisterPage,
        type PageItem,
    } from './page.js';
    import PageContainer from './PageContainer.svelte';
    import TabApp from './TabApp.svelte';
    import TabEntry from './TabEntry.svelte';

    const EXPLORE_PAGE = registerPage({
        id: 'explore',
        component: ExplorePage,
        data: undefined,
    });

    const CONNECT_PAGE = registerPage({
        id: 'connect',
        component: ConnectPage,
        data: undefined,
    });

    const SETTINGS_PAGE = registerPage({
        id: 'settings',
        component: PageSettings,
        data: undefined,
    });

    async function openApps() {
        omu.server.apps.listen();
        const update = async (apps: Map<string, App>) => {
            const services = [...apps.values().filter((app) => app.type === 'service')];
            for (const service of services) {
                const id = `app-${service.id.key()}`;
                const page: PageItem<{ app: App }> = {
                    id,
                    component: AppPage,
                    data: {
                        app: service,
                    },
                };
                $pages[id] = {
                    type: 'loaded',
                    page,
                };
            }
            const lastApps = [...apps.values().filter((app) => app.id.key() === $lastApp)];
            for (const app of lastApps) {
                const id = `app-${app.id.key()}`;
                const page: PageItem<{ app: App }> = {
                    id,
                    component: AppPage,
                    data: {
                        app: app,
                    },
                };
                $pages[id] = {
                    type: 'loaded',
                    page,
                };
            }
        };
        omu.server.apps.event.cacheUpdate.listen((newApps) => update(newApps));
        update(await omu.server.apps.fetchAll());
    }

    let onlineChats = $state(0);

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
        openApps();
    });
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
                        <ButtonMini onclick={() => {
                            $managingApps = !$managingApps;
                        }}>
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
            <TableList table={omu.server.apps} filter={(_, app) => {
                if (!app.url) return false;
                if (app.parentId) return false;
                if ($devMode) return true;
                return app.type === 'app';
            }}>
                {#snippet component({ entry, selected })}
                    <TabApp {entry} {selected} />
                {/snippet}
                {#snippet empty()}
                    <button
                        onclick={() => ($currentPage = EXPLORE_PAGE.id)}

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
                {/snippet}
            </TableList>
        </div>
    </div>
    <PageContainer />
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

    main {
        display: flex;
        flex-direction: row;
        height: 100%;
        background: var(--color-bg-1);
        font-weight: 600;
    }
</style>
