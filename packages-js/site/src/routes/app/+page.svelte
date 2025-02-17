<script lang="ts">
    import Page from '$lib/components/Page.svelte';
    import type { NetworkStatus } from '@omujs/omu/network/network.js';
    import { Button, Spinner } from '@omujs/ui';
    import { onMount } from 'svelte';
    import { omu } from '../client.js';
    import AppEntry from './AppEntry.svelte';
    import { apps, personalApps } from './apps.js';

    let filteredApps = apps;
    let filterTags: string[] = [];
    let search = '';
    let password = '';
    let status: NetworkStatus = omu.network.status;
    let connecting = true;

    function toggleTag(category: string) {
        if (filterTags.includes(category)) {
            filterTags = filterTags.filter((c) => c !== category);
        } else {
            filterTags = [...filterTags, category];
        }
    }

    function updateFilters(filterTags: string[], search: string, password: string) {
        filteredApps = [
            ...(personalApps[password] || []),
            ...apps
        ];
        if (filterTags.length !== 0) {
            filteredApps = apps.filter((app) => {
                return filterTags.some((tag) => app.metadata?.tags?.includes(tag));
            });
        }
        if (!filterTags.includes('underdevelopment')) {
            filteredApps = filteredApps.filter(
                (app) => !app.metadata?.tags?.includes('underdevelopment'),
            );
        }
        if (search) {
            filteredApps = filteredApps.filter((app) => {
                if (!app.metadata?.name) return;
                const name = app.metadata.name;
                if (omu.i18n.translate(name).toLowerCase().includes(search.toLowerCase())) {
                    return true;
                }
                const tags = app.metadata.tags;
                if (tags) {
                    return tags.some((tag) =>
                        omu.i18n.translate(tag).toLowerCase().includes(search.toLowerCase()),
                    );
                }
                const description = app.metadata.description;
                if (description) {
                    return omu.i18n
                        .translate(description)
                        .toLowerCase()
                        .includes(search.toLowerCase());
                }
                return false;
            });
        }
    }

    onMount(() => {
        status = omu.network.status;
        const unlistenNetwork = omu.network.event.status.listen((value) => {
            console.log('Network status:', value);
            status = value;
            if (status.type === 'connected') {
                connecting = false;
            }
        });
        const unlistenApps = omu.dashboard.apps.listen();
        return async () => {
            unlistenNetwork();
            unlistenApps();
        };
    });

    $: {
        updateFilters(filterTags, search, password);
    }
</script>

<svelte:head>
    <title>OMUAPPS - アプリを探す</title>
    <meta name="description" content="OMUAPPSで使えるアプリを探してみる" />
</svelte:head>

<Page header={false}>
    <header slot="header">
        <h1>
            アプリを探す
            <i class="ti ti-search"></i>
        </h1>
        <small> アプリを探してみる </small>
    </header>
    <main slot="content">
        <div class="left">
            <h3>
                アプリ
                <i class="ti ti-apps"></i>
            </h3>
            <div class="apps">
                {#if status['type'] === 'ready'}
                    {#each filteredApps as app (app.key())}
                        <AppEntry {app} />
                    {/each}
                {:else}
                    <div class="loading">
                        {#if status['type'] === 'disconnected'}
                            {#if connecting}
                                <p>
                                    接続中
                                    <Spinner />
                                </p>
                            {:else}
                                <p>
                                    接続が切断されました
                                    <Button primary onclick={() => omu.network.connect()}>再接続</Button>
                                </p>
                            {/if}
                        {:else if status['type'] === 'reconnecting'}
                            <p>
                                接続に失敗しました ({status.attempt}回目)
                                <Button primary disabled>再接続中…</Button>
                            </p>
                            <small>
                                <p>APIが起動していない可能性があります。</p>
                                <p>管理画面が起動してあるか確認してください。</p>
                            </small>
                        {:else if status['type'] === 'connecting'}
                            <p>
                                接続中
                                <Spinner />
                            </p>
                        {:else if status['type'] === 'connected'}
                            <p>
                                認証中
                                <Spinner />
                            </p>
                        {:else if status['type'] === 'closed'}
                            <p>
                                接続が切断されました
                                <Button primary onclick={() => omu.network.connect()}>再接続</Button>
                            </p>
                        {:else if status['type'] === 'error'}
                            <p>
                                エラーが発生しました
                                <Button primary onclick={() => omu.network.connect()}>再接続</Button>
                            </p>
                            <small>
                                {status['error'].message}
                            </small>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>
        <div class="options">
            <h3>
                表示設定
                <i class="ti ti-filter"></i>
            </h3>
            <input type="search" placeholder="アプリを検索 ..." bind:value={search} />
            <button on:click={() => toggleTag('underdevelopment')} class="tag" class:selected={filterTags.includes('underdevelopment')}>
                <i class="ti ti-package"></i>
                開発中のアプリを表示
                <span class="hint">{apps.filter((app) => app.metadata?.tags?.includes('underdevelopment')).length}</span>
            </button>
            <input type="password" placeholder="個人用アプリのパス ..." bind:value={password} />
        </div>
    </main>
</Page>

<style lang="scss">
    h1 {
        font-size: 2rem;
        font-weight: 600;
        width: fit-content;
        color: var(--color-1);
    }
    
    h3 {
        font-size: 0.9rem;
        color: var(--color-1);
        margin-bottom: 0.25rem;
    }

    main {
        display: flex;
        flex-direction: row;
        gap: 1rem;
    }

    .options {
        width: 15rem;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .left {
        flex: 1;
        display: flex;
        flex-direction: column;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .apps {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        flex: 1;
    }

    input {
        width: 100%;
        height: 40px;
        border: none;
        background: var(--color-bg-1);
        color: var(--color-1);
        font-weight: 600;
        text-align: start;
        padding: 0.5rem 0.8rem;
        margin-bottom: 1rem;
        outline-color: var(--color-1);

        &::placeholder {
            color: var(--color-text);
            font-size: 0.8rem;
            opacity: 0.5;
        }

        &:hover,
        &:focus {
            outline: 1px solid;
            outline-offset: -1px;
        }
    }

    .tag {
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        height: 40px;
        border: none;
        background: var(--color-bg-1);
        color: var(--color-1);
        font-weight: 600;
        padding: 0.5rem 1rem;
        outline-color: var(--color-1);

        > .hint {
            font-size: 0.8rem;
            font-weight: 400;
            margin-left: auto;
        }

        &.selected {
            background: var(--color-1);
            color: var(--color-bg-2);
            outline-color: var(--color-bg-2);
        }

        &:hover {
            background: var(--color-bg-1);
            color: var(--color-1);
            outline: 1px solid var(--color-1);
            outline-offset: -1px;
            transition: 0.0621s;
            transition-property: margin-left;
        }

        &:active {
            margin-left: 1px;
        }
    }

    .loading {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        outline: 1px solid var(--color-bg-1);
        outline-offset: -1px;
        border-radius: 3px;
        padding: 4rem 2rem;

        > p {
            display: flex;
            align-items: center;
            gap: 1rem;
            color: var(--color-1);
        }

        > small {
            font-size: 0.8rem;
            color: var(--color-text);
        }
    }
</style>
