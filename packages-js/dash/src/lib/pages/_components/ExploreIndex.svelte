<script lang="ts">
    import { omu } from '$lib/client';
    import type { App } from '@omujs/omu';
    import { AppIndexRegistry, type AppIndexEntry } from '@omujs/omu/api/server';
    import type { LocalizedText } from '@omujs/omu/localization';
    import { ButtonMini, Spinner, Tooltip } from '@omujs/ui';
    import { onMount } from 'svelte';
    import { filter } from '../explore';
    import ExploreAppEntry from './ExploreAppEntry.svelte';

    interface Props {
        id: string;
        entry: AppIndexEntry;
    }

    let { id, entry }: Props = $props();

    let indexState: {
        type: 'loading';
    } | {
        type: 'failed';
        message: string;
    } | {
        type: 'result';
        index: AppIndexRegistry;
    } = $state({ type: 'loading' });

    function formatError(error: unknown) {
        if (error instanceof Error) {
            return error.message;
        }
        return JSON.stringify(error);
    }

    async function load() {
        try {
            indexState = { type: 'loading' };
            const resp = await omu.http.fetch(entry.url);
            const index = AppIndexRegistry.fromJSON(await resp.json());
            indexState = { type: 'result', index };
        } catch (err) {
            indexState = { type: 'failed', message: formatError(err) };
            console.error(err);
        }
    }

    onMount(() => {
        load();
    });

    let url = $derived(new URL(entry.url));

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
    <div class="body">
        <Tooltip>
            {url.host}によって提供されているアプリ
        </Tooltip>
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
        <ButtonMini onclick={async () => {
            await omu.server.index.update((index) => {
                delete index.indexes[id];
                return index;
            });
        }}>
            <Tooltip>
                この提供元を削除
            </Tooltip>
            <i class="ti ti-x"></i>
        </ButtonMini>
        <ButtonMini onclick={load}>
            <Tooltip>
                再読み込み
            </Tooltip>
            <i class="ti ti-reload"></i>
        </ButtonMini>
    </div>
</div>
{#if indexState.type === 'loading'}
    <Spinner />
{:else if indexState.type === 'failed'}
    <div class="apps">
        <p>
            読み込みに失敗しました
            <small>
                {indexState.message}
            </small>
        </p>
    </div>
{:else if indexState.type === 'result'}
    <div class="apps">
        {#each filterApps([...indexState.index.apps.values()], $filter) as app (app.id.key())}
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
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        padding-right: 1rem;

        &:hover {
            background: var(--color-bg-2);
            box-shadow: 0 1px var(--color-outline);
        }

        > .body {
            flex: 1;
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
