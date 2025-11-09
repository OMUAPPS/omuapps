<script lang="ts">
    import { omu } from '$lib/client';
    import type { App } from '@omujs/omu';
    import { AppIndexRegistry, type AppIndexEntry } from '@omujs/omu/api/server';
    import type { LocalizedText } from '@omujs/omu/localization';
    import { Tooltip } from '@omujs/ui';
    import { filter } from '../explore';
    import ExploreAppEntry from './ExploreAppEntry.svelte';

    export let entry: AppIndexEntry;

    async function fetchIndex(entry: AppIndexEntry) {
        const resp = await fetch(entry.url);
        const index = AppIndexRegistry.fromJSON(await resp.json());
        return index;
    }

    $: url = new URL(entry.url);

    function filterApps(apps: App[], filter: typeof $filter) {
        return apps.filter((app) => {
            if (
                !filter.showIndev
                && app.metadata?.tags?.includes('underdevelopment')
            ) return false;
            if (filter.search) {
                const { metadata } = app;
                const strings = [
                    metadata?.name,
                    metadata?.description,
                    metadata?.authors,
                    app.id.key(),
                ]
                    .filter((it): it is string | LocalizedText => !!it)
                    .map((text) => typeof text === 'string' ? text : omu.i18n.translate(text));
                if (!strings.some((text) => text.includes(filter.search))) {
                    return false;
                }
            }
            return true;
        });
    }
</script>

<h2>
    <Tooltip>
        {url.host}によって提供されているアプリ
    </Tooltip>
    {url.host}
</h2>
<div class="apps">
    {#await fetchIndex(entry) then index}
        {#each filterApps([...index.apps.values()], $filter) as app (app.id.key())}
            <ExploreAppEntry {app} />
        {:else}
            <p>No apps found</p>
        {/each}
    {:catch error}
        <p>Error occurred: {error}</p>
    {/await}
</div>

<style lang="scss">
    .apps {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: min(40rem, 100%);
        margin-bottom: 3rem;
        padding-bottom: 3rem;
        &:not(&:last-child) {
            border-bottom: 1px solid var(--color-outline);
        }
    }

    h2 {
        margin-bottom: 2rem;
    }
</style>
