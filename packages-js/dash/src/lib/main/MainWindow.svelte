<script lang="ts">
    import { dashboard } from '$lib/client.js';
    import { TableList, Tooltip } from '@omujs/ui';
    import AppEntry from './AppEntry.svelte';
    import { loadedIds, page, type Page, type PageItem } from './page.js';
    import IframePage from './IframePage.svelte';
    import { DEV } from 'esm-env';
    import ConnectPage from './ConnectPage.svelte';

    const DOWNLOAD_PAGE = {
        id: `download`,
        async open() {
            return {
                component: IframePage,
                props: {
                    url: DEV ? 'http://localhost:5173/app/' : 'http://localhost:5173/app/',
                },
            };
        },
    } as PageItem<unknown>;

    const CONNECT_PAGE = {
        id: `connect`,
        async open() {
            return {
                component: ConnectPage,
                props: {},
            };
        },
    } as PageItem<unknown>;

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

<main>
    <div class="tabs">
        <button
            class="tab"
            on:click={() => ($page = DOWNLOAD_PAGE)}
            class:active={$page === DOWNLOAD_PAGE}
        >
            <i class="ti ti-search" />
            <span>アプリを探す</span>
            <i class="open ti ti-chevron-right" />
        </button>
        <button
            class="tab"
            on:click={() => ($page = CONNECT_PAGE)}
            class:active={$page === CONNECT_PAGE}
        >
            <i class="ti ti-message" />
            <span>配信をつなげる</span>
            <i class="open ti ti-chevron-right" />
        </button>
        <button class="tab">
            <i class="ti ti-settings" />
            <span>設定</span>
            <i class="open ti ti-chevron-right" />
        </button>
        <div class="tab-group">
            <span>アプリ</span>
            <div class="buttons">
                <button>
                    <Tooltip>
                        <div class="tooltip">
                            <h3>アプリを追加</h3>
                            <small>新しいアプリを追加します</small>
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
                    <i class="ti ti-chevron-down" />
                </button>
            </div>
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

    main {
        display: flex;
        flex-direction: row;
        height: 100%;
        background: var(--color-bg-1);
        font-weight: 600;
    }

    .tabs {
        display: flex;
        flex-direction: column;
        width: $tab-width;
        background: var(--color-bg-2);
        border-right: 1px solid var(--color-outline);
        padding: 1rem 0.5rem;
    }

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

        > i {
            font-size: 1rem;
            margin-right: 1rem;
        }

        > .open {
            margin-left: auto;
            display: none;
        }

        &:hover {
            background: var(--color-bg-1);
            transition: background 0.0621s;

            > .open {
                display: block;
                margin-right: 0rem;
                transition: margin 0.0621s;
            }
        }

        &.active {
            background: var(--color-bg-1);
            color: var(--color-1);
            border-right: 3px solid var(--color-1);
        }
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
        left: $tab-width;
        right: 0;
        width: calc(100% - #{$tab-width});
        bottom: 0;
        z-index: 1;

        &.visible {
            display: block;
        }
    }
</style>
