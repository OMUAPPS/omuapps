<script lang="ts">
    import { omu } from '$lib/client.js';
    import type { AppIndexEntry } from '@omujs/omu/api/server';
    import { Checkbox, Spinner, Textbox } from '@omujs/ui';
    import { DEV } from 'esm-env';
    import { onMount } from 'svelte';
    import { isBetaEnabled } from '../settings.js';
    import ExploreIndex from './_components/ExploreIndex.svelte';
    import { filter } from './explore.js';

    export const props = {};

    function setIndex() {
        omu.server.index.modify((index) => {
            const { indexes } = index;
            if (DEV) {
                indexes['com.omuapps'] = {
                    url: 'http://localhost:5173/apps.json',
                    added_at: new Date().toISOString(),
                };
            }
            if ($isBetaEnabled) {
                indexes['com.omuapps.beta'] = {
                    url: 'https://beta.omuapps.com/apps.json',
                    added_at: new Date().toISOString(),
                };
            }
            indexes['com.omuapps'] = {
                url: 'https://omuapps.com/apps.json',
                added_at: new Date().toISOString(),
            };
            return index;
        });
    }

    async function load() {
        const { indexes } = await omu.server.index.get();
        state = {
            type: 'loaded',
            indexes,
        };
    }

    onMount(() => {
        setIndex();
        load();
    });

    let state: {
        type: 'loading';
    } | {
        type: 'loaded';
        indexes: Record<string, AppIndexEntry>;
    } = { type: 'loading' };
</script>

<div class="container omu-scroll">
    <header>
        <div class="header-content">
            <h1>
                アプリを探す
                <i class="ti ti-search"></i>
            </h1>
            <small>アプリを探してみる</small>
        </div>
    </header>
    <div class="content">
        <div class="margin">
            <div class="entries">
                {#if state.type === 'loading'}
                    <Spinner />
                {:else if state.type === 'loaded'}
                    {#each Object.entries(state.indexes) as [id, entry] (id)}
                        <ExploreIndex {entry} />
                    {:else}
                        <p>No indexes</p>
                    {/each}
                {/if}
            </div>
            <div class="filters">
                <div class="filter">
                    <p>検索</p>
                    <Textbox bind:value={$filter.search} />
                </div>
                <!-- svelte-ignore a11y-label-has-associated-control -->
                <label class="filter">
                    <p>開発中のベータ段階のアプリを含む</p>
                    <Checkbox bind:value={$filter.showIndev} />
                </label>
            </div>
        </div>
    </div>
</div>

<style lang="scss">
    .container {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        overflow: auto;
    }

    $haeder-height: min(42vh, calc(100vw));

    header {
        top: 0;
        display: flex;
        height: $haeder-height;
        font-weight: 600;
        width: min(100%, 70rem);
        max-width: 70rem;
        padding: 0 4rem;
        margin: 0 auto;

        .header-content {
            display: flex;
            flex-direction: column;
            justify-content: center;
            height: 100%;
            width: 100%;
            padding-top: 10rem;
            padding-bottom: 4rem;
        }
    }

    h1 {
        color: var(--color-1);
    }

    .margin {
        display: flex;
        flex-direction: row;
        justify-content: space-around;
        flex: 1;
        width: min(100%, 70rem);
        max-width: 70rem;
        padding: 0 4rem;
        margin: 0 auto;
        padding-top: 4rem;
        gap: 4rem;

        > .entries {
            flex: 1;
            display: flex;
            flex-direction: column;
            width: min(40rem, 100%);
        }

        > .filters {
            border-left: 1px solid var(--color-outline);
            padding-left: 4rem;
            margin-left: 2rem;
        }
    }

    .content {
        background: var(--color-bg-2);
    }

    .filter {
        display: flex;
        flex-direction: column;
        white-space: nowrap;
        align-items: baseline;
        margin-top: 1rem;
        margin-bottom: 2rem;

        > p {
            margin-bottom: 1rem;
        }
    }
</style>
