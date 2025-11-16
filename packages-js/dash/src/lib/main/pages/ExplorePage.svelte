<script lang="ts">
    import { omu } from '$lib/client.js';
    import type { AppIndex, AppIndexEntry } from '@omujs/omu/api/server';
    import { Checkbox, Spinner, Textbox } from '@omujs/ui';
    import { DEV } from 'esm-env';
    import { isBetaEnabled } from '../settings.js';
    import ExploreIndex from './_components/ExploreIndex.svelte';
    import { filter } from './explore.js';

    export const props = {};
    const index = omu.server.index.compatSvelte();

    async function setIndex() {
        if (DEV && !$index.indexes['com.omuapps']) {
            $index.indexes['com.omuapps'] ??= {
                url: 'http://localhost:5173/apps.json',
                meta: {
                    name: 'OMUAPPS',
                    note: {
                        ja: 'OMUAPPS公式アプリ',
                        en: 'Official OMUAPPS',
                    },
                },
                added_at: new Date().toISOString(),
            };
        } else if (!$index.indexes['com.omuapps']) {
            $index.indexes['com.omuapps'] ??= {
                url: 'https://omuapps.com/apps.json',
                meta: {
                    name: 'OMUAPPS - Beta',
                    note: {
                        ja: 'ベータ版OMUAPPS公式アプリ',
                        en: 'Official Beta Channel OMUAPPS',
                    },
                },
                added_at: new Date().toISOString(),
            };
        }
        if ($isBetaEnabled && !$index.indexes['com.omuapps.beta']) {
            $index.indexes['com.omuapps.beta'] ??= {
                url: 'https://beta.omuapps.com/apps.json',
                meta: {
                    name: 'OMUAPPS',
                    note: {
                        ja: 'OMUAPPS公式アプリ',
                        en: 'Official OMUAPPS',
                    },
                },
                added_at: new Date().toISOString(),
            };
        }
    }

    async function load({ indexes }: AppIndex) {
        await setIndex();
        state = {
            type: 'loaded',
            indexes: Object.fromEntries(Object.entries(indexes).sort(([,a], [,b]) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime())),
        };
    }

    $: index.wait().then(() => load($index));

    let state: {
        type: 'loading';
    } | {
        type: 'loaded';
        indexes: Record<string, AppIndexEntry>;
    } = { type: 'loading' };

    let elements: Record<string, HTMLElement> = {};
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
                        <div class="entry" bind:this={elements[id]}>
                            <ExploreIndex {id} {entry} />
                        </div>
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
                    <p>開発段階のアプリを含む</p>
                    <Checkbox bind:value={$filter.showIndev} />
                </label>
                {#if state.type === 'loaded'}
                    <h3>提供元</h3>
                    <div class="providers">
                        {#each Object.entries(state.indexes).filter(([, entry]) => !!entry) as [id, entry] (id)}
                            <button on:click={() => {
                                elements[id]?.scrollIntoView({
                                    behavior: 'smooth',
                                });
                            }}>
                                {#if entry.meta}
                                    {omu.i18n.translate(entry.meta.name)}
                                {:else}
                                    {id.split('.').reverse().join('.').split(':').reverse().join('/')}
                                {/if}
                                <i class="ti ti-chevron-right"></i>
                            </button>
                        {/each}
                    </div>
                {/if}
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
            gap: 1.5rem;
            padding-bottom: 6rem;
            width: min(40rem, 100%);
        }

        > .filters {
            position: sticky;
            top: 4rem;
            height: fit-content;
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

    .providers {
        display: flex;
        flex-direction: column;

        > button {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            padding: 1rem 0;
            background: var(--color-bg-2);
            border: none;
            border-bottom: 1px solid var(--color-outline);
            cursor: pointer;
            > .ti-chevron-right {
                visibility: hidden;
            }

            &:hover {
                background: var(--color-bg-2);

                > .ti-chevron-right {
                    visibility: visible;
                }
            }
        }
    }
</style>
