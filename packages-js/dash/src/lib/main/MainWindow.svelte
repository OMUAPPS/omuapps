<script lang="ts">
    import { dashboard } from '$lib/client.js';
    import { TableList, Tooltip } from '@omujs/ui';
    import { DEV } from 'esm-env';
    import AppEntry from './AppEntry.svelte';
    import { loadedIds, page, registerPage, type Page } from './page.js';
    import ConnectPage from './pages/ConnectPage.svelte';
    import IframePage from './pages/IframePage.svelte';
    import SettingsPage from './SettingsPage.svelte';
    import { menuOpen } from './stores.js';
    import TabEntry from './TabEntry.svelte';

    const EXPLORE_PAGE = registerPage({
        id: `explore`,
        async open() {
            return {
                component: IframePage,
                props: {
                    url: DEV ? 'http://localhost:5173/app/' : 'http://localhost:5173/app/',
                },
            } as Page<unknown>;
        },
    });

    const CONNECT_PAGE = registerPage({
        id: `connect`,
        async open() {
            return {
                component: ConnectPage,
                props: {},
            } as Page<unknown>;
        },
    });

    const SETTINGS_PAGE = registerPage({
        id: `settings`,
        async open() {
            return {
                component: SettingsPage,
                props: {},
            } as Page<unknown>;
        },
    });

    const pages: Map<string, Page<unknown>> = new Map();
    let loading = false;

    page.subscribe(async (value) => {
        if (value) {
            loading = true;
            const page = await value.open();
            $loadedIds = [...$loadedIds, value.id];
            pages.set(value.id, page);
            loading = false;
        }
    });
</script>

<main class:open={$menuOpen}>
    <div class="tabs">
        <button class="menu" on:click={() => ($menuOpen = !$menuOpen)}>
            {#if $menuOpen}
                <i class="ti ti-chevron-left" />
                <Tooltip>メニューを閉じる</Tooltip>
            {:else}
                <i class="ti ti-menu" />
                <Tooltip>メニューを開く</Tooltip>
            {/if}
        </button>
        <TabEntry entry={EXPLORE_PAGE} />
        <TabEntry entry={CONNECT_PAGE} />
        <TabEntry entry={SETTINGS_PAGE} />
        <div class="tab-group">
            {#if $menuOpen}
                <span>
                    アプリ
                    <i class="ti ti-package" />
                </span>
                <div class="buttons">
                    <!-- <button>
                        <Tooltip>
                            <div class="tooltip">
                                <h3>アプリを管理</h3>
                                <small>設定やアンインストールを行います</small>
                            </div>
                        </Tooltip>
                        <i class="ti ti-settings" />
                    </button>
                    <button>
                        <Tooltip>
                            <div class="tooltip">
                                <h3>アプリを並び替え</h3>
                                <small>アプリの並び順を変更します</small>
                            </div>
                        </Tooltip>
                        <i class="ti ti-sort-descending" />
                    </button> -->
                </div>
            {/if}
        </div>
        <div class="list">
            <TableList table={dashboard.apps} component={AppEntry} />
        </div>
    </div>
    <div class="page-container">
        {#if $page}
            {@const current = $page.id}
            {#each pages.entries() as [id, page] (id)}
                <div class="page" class:visible={!loading && current === id}>
                    <svelte:component this={page.component} props={page.props} />
                </div>
            {/each}
        {/if}
        {#if loading}
            <div>Loading...</div>
        {/if}
    </div>
</main>

<style lang="scss">
    $tab-width: 300px;

    i {
        pointer-events: none;
    }

    .tabs {
        display: flex;
        flex-direction: column;
        width: $tab-width;
        background: var(--color-bg-2);
        border-right: 1px solid var(--color-outline);
        padding: 1rem 0.5rem;
        padding-bottom: 0.5rem;
    }

    .menu {
        display: flex;
        flex-direction: row;
        align-items: center;
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
            margin-right: 1rem;
        }

        &:hover {
            background: var(--color-bg-1);
            transition: background 0.0621s;
        }
    }

    .list {
        display: flex;
        flex-direction: column;
        padding-top: 0.5rem;
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
        margin-top: 1rem;
        padding-left: 1rem;

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

                &:hover {
                    background: var(--color-1);
                    color: var(--color-bg-1);
                    border-radius: 4px;
                }
            }
        }
    }

    .page-container {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        background: var(--color-bg-1);
    }

    .page {
        position: absolute;
        display: none;
        width: 100%;
        height: 100%;
        background: var(--color-bg-1);
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
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

        > .tabs {
            width: 4rem;
            transition: width 0.0621s;
        }

        .page {
            left: 4rem;
            width: calc(100% - 4rem);
        }

        &.open {
            > .tabs {
                width: $tab-width;
                transition: width 0.0621s;
            }

            .page {
                left: $tab-width;
                width: calc(100% - #{$tab-width});
            }
        }
    }
</style>
