<script lang="ts">
    import Page from '$lib/components/Page.svelte';
    import { omu } from '../client.js';
    import AppEntry from './AppEntry.svelte';
    import { apps, personalApps } from './apps.js';

    let filteredApps = apps;
    let filterTags: string[] = [];
    let search = '';
    let password = '';

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

    $: {
        updateFilters(filterTags, search, password);
    }
</script>

<svelte:head>
    <title>OMUAPPS - アプリを探す</title>
    <meta name="description" content="OMUAPPSで使えるアプリを探してみる" />
</svelte:head>

<Page>
    <header slot="header">
        <h1>
            アプリを探す
            <i class="ti ti-search" />
        </h1>
        <small> アプリを探してみる </small>
    </header>
    <main slot="content">
        <div class="left">
            <h3>アプリ</h3>
            <input type="search" placeholder="アプリを検索 ..." bind:value={search} />
            <div class="apps">
                {#each filteredApps as app (app.key())}
                    <AppEntry {app} />
                {/each}
            </div>
        </div>
        <div class="options">
            <h3>表示設定</h3>
            <button on:click={() => toggleTag('underdevelopment')} class="tag" class:selected={filterTags.includes('underdevelopment')}>
                <i class="ti ti-package" />
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
    }

    main {
        display: flex;
        flex-direction: row;
        gap: 1rem;
    }

    .options {
        width: 300px;
        height: 100%;
        margin-right: 40px;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .left {
        flex: 1;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .apps {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
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
            outline: 1px solid;
            outline-offset: -1px;
            transition: 0.0621s;
            transition-property: margin-left;
        }

        &:active {
            margin-left: 1px;
        }
    }
</style>
