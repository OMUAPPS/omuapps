<script lang="ts">
    import Page from '$lib/components/Page.svelte';
    import { omu } from '../client.js';
    import AppEntry from './AppEntry.svelte';
    import { apps } from './apps.js';

    let filteredApps = apps;
    let filterTags: string[] = [];
    let search = '';

    function toggleTag(category: string) {
        if (filterTags.includes(category)) {
            filterTags = filterTags.filter((c) => c !== category);
        } else {
            filterTags = [...filterTags, category];
        }
    }

    function updateFilters(filterTags: string[], search: string) {
        filteredApps = apps;
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
        updateFilters(filterTags, search);
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
        <div class="apps">
            <input type="search" placeholder="アプリを検索" bind:value={search} />
            {#each filteredApps as app (app.key())}
                <AppEntry {app} />
            {/each}
        </div>
        <div class="tags">
            <button on:click={() => toggleTag('underdevelopment')} class="tag" class:selected={filterTags.includes('underdevelopment')}>
                <i class="ti ti-package" />
                開発中のアプリを表示
                <span class="hint">{apps.filter((app) => app.metadata?.tags?.includes('underdevelopment')).length}</span>
            </button>
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

    main {
        display: flex;
        flex-direction: row;
        gap: 1rem;
    }

    .tags {
        width: 300px;
        height: 100%;
        margin-right: 40px;
    }

    .apps {
        flex: 1;
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
    }

    input[type='search'] {
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
            color: var(--color-1);
            font-size: 0.9rem;
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
        width: 100%;
        height: 40px;
        border: none;
        background: var(--color-bg-1);
        color: var(--color-1);
        font-weight: 600;
        text-align: start;
        padding: 0.5rem 1rem;
        gap: 10px;
        margin-bottom: 2px;
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
