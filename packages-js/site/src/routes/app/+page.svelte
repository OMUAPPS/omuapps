<script lang="ts">
    import Page from '$lib/components/Page.svelte';
    import { FlexColWrapper, FlexRowWrapper, Localized, Textbox } from '@omujs/ui';
    import { omu } from '../client.js';
    import AppEntry from './AppEntry.svelte';
    import { apps } from './apps.js';
    import { TAG_REGISTRY } from './category.js';

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
        <FlexRowWrapper widthFull heightFull between gap>
            <div class="tags">
                <h3>
                    <i class="ti ti-tag" />
                    タグから探す
                </h3>
                <FlexColWrapper>
                    {#each Object.entries(TAG_REGISTRY) as [key, tag] (key)}
                        {@const selected = filterTags.includes(key)}
                        <button on:click={() => toggleTag(key)} class="tag" class:selected>
                            <i class={tag.icon} />
                            <Localized text={tag.name} />
                            <i class="hint ti ti-{selected ? 'check' : 'plus'}" />
                        </button>
                    {/each}
                </FlexColWrapper>
            </div>
            <FlexColWrapper widthFull gap>
                <div class="search">
                    <Textbox placeholder="アプリを検索" bind:value={search} />
                    {#if search}
                        <button on:click={() => (search = '')} class="clear">
                            <i class="ti ti-x" />
                        </button>
                    {/if}
                </div>
                {#each filteredApps as app (app.key())}
                    <AppEntry {app} />
                {/each}
            </FlexColWrapper>
        </FlexRowWrapper>
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
        margin-bottom: 1rem;
        color: var(--color-1);
    }

    .tags {
        width: 300px;
        height: 100%;
        margin: 30px 0;
        margin-right: 40px;

        > h3 {
            margin-bottom: 30px;
        }
    }

    .search {
        display: flex;
        align-items: center;
        width: 100%;
        margin-bottom: 20px;
    }

    .clear {
        width: 2rem;
        height: 2rem;
        border: none;
        background: transparent;
        color: var(--color-1);
        margin-left: 0.5rem;
        cursor: pointer;
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
        padding: 0 10px;
        gap: 10px;
        margin-bottom: 2px;
        outline-color: var(--color-1);

        > i {
            font-size: 20px;
        }

        > .hint {
            font-size: 16px;
            margin-left: auto;
        }

        &.selected {
            background: var(--color-1);
            color: var(--color-bg-2);
            outline-color: var(--color-bg-2);
        }

        &:hover {
            outline: 1px solid;
            outline-offset: -3px;
            transition: 0.0621s;
            transition-property: margin-left;
            margin-left: 2px;
        }

        &:active {
            margin-left: 1px;
        }
    }
</style>
