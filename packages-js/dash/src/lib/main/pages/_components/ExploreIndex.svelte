<script lang="ts">
    import { omu } from '$lib/client';
    import type { App } from '@omujs/omu';
    import { AppIndexRegistry, type AppIndexEntry } from '@omujs/omu/api/server';
    import type { LocalizedText } from '@omujs/omu/localization';
    import { Button, Spinner, Tooltip } from '@omujs/ui';
    import { onMount } from 'svelte';
    import { filter } from '../explore';
    import ExploreAppEntry from './ExploreAppEntry.svelte';

    export let id: string;
    export let entry: AppIndexEntry;

    let state: {
        type: 'loading';
    } | {
        type: 'failed';
        message: string;
    } | {
        type: 'result';
        index: AppIndexRegistry;
    } = { type: 'loading' };

    function formatError(error: unknown) {
        if (error instanceof Error) {
            return error.message;
        }
        return JSON.stringify(error);
    }

    onMount(async () => {
        try {
            const resp = await omu.http.fetch(entry.url);
            const index = AppIndexRegistry.fromJSON(await resp.json());
            state = { type: 'result', index };
        } catch (err) {
            state = { type: 'failed', message: formatError(err) };
            console.error(err);
        }
    });

    $: url = new URL(entry.url);

    function filterApps(apps: App[], filter: typeof $filter) {
        return apps.filter((app) => {
            if (app.type !== 'app') return false;
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

<div class="info">
    <Tooltip>
        {url.host}によって提供されているアプリ
    </Tooltip>
    <div class="body">
        <h2>
            {#if entry.meta}
                {omu.i18n.translate(entry.meta.name)}
            {:else}
                <p class="id">{id.split('.').reverse().join('.')}</p>
            {/if}
        </h2>
        {#if entry.meta}
            <small>{omu.i18n.translate(entry.meta.note)}</small>
        {/if}
    </div>
    <div class="actions">
        <Button onclick={() => {
            omu.server.index.modify((index) => {
                delete index.indexes[id];
                return index;
            });
        }}>
            <Tooltip>
                この提供元を削除
            </Tooltip>
            削除
            <i class="ti ti-x"></i>
        </Button>
    </div>
</div>
{#if state.type === 'loading'}
    <Spinner />
{:else if state.type === 'failed'}
    <div class="apps">
        <p>
            読み込みに失敗しました
            <small>
                {state.message}
            </small>
        </p>
    </div>
{:else if state.type === 'result'}
    <div class="apps">
        {#each filterApps([...state.index.apps.values()], $filter) as app (app.id.key())}
            <ExploreAppEntry {app} />
        {:else}
            <p>No apps found</p>
        {/each}
    </div>
{/if}

<style lang="scss">
    .apps {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: min(40rem, 100%);
        padding-bottom: 3rem;
        &:not(&:last-child) {
            border-bottom: 1px solid var(--color-outline);
        }
    }

    .info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 2rem;

        &:hover {
            outline: 1px solid var(--color-outline);
            outline-offset: 1rem;
        }
    }

    h2 {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        color: var(--color-1);

        > p {
            font-size: 1rem;
        }
    }
</style>
