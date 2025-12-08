<script lang="ts">
    import { omu } from '$lib/client.js';
    import AppInfo from '$lib/common/AppInfo.svelte';
    import { t } from '$lib/i18n/i18n-context';
    import Screen from '$lib/screen/Screen.svelte';
    import type { ScreenHandle } from '$lib/screen/screen.js';
    import { App } from '@omujs/omu';
    import { Button, TableList, Tooltip } from '@omujs/ui';
    import { devMode } from '../../settings';
    import AppEntry from './EntryApp.svelte';
    import { selectedApp } from './stores';

    interface Props {
        handle: ScreenHandle;
        props: undefined;
    }

    let { handle }: Props = $props();

</script>

<Screen {handle}>
    <div class="container">
        <h3>
            アプリ
            <small>
                {#await omu.server.apps.size()}
                    <i class="spin ti ti-dots"></i> 件
                {:then count}
                    {count} 件
                {/await}
            </small>
        </h3>
        <ul class="apps">
            <TableList
                table={omu.server.apps}
                filter={(_, app) => !app.parentId && (
                    (app && (app.type === 'app' || app.type === 'remote'))
                    || ($devMode && (app.type === 'plugin' || app.type === 'service'))
                )}
            >
                {#snippet component({ entry })}
                    <AppEntry {entry} />
                {/snippet}
            </TableList>
        </ul>
        <div class="actions">
            <Button primary onclick={() => handle.close()}>
                {$t('general.close')}
                <i class="ti ti-x"></i>
            </Button>
        </div>
    </div>
    {#snippet info()}
        <div class="info">
            {#if $selectedApp}
                <div class="app">
                    <AppInfo app={$selectedApp} />
                </div>
                {#await omu.server.apps
                    .fetchAll()
                    .then((items) => [...items
                        .entries()]
                        .filter(([, app]) => $selectedApp && app.parentId && app.parentId.isSubpathOf($selectedApp.id)),
                    ) then children}
                    {#if children.length > 0}
                        <div class="children omu-scroll">
                            <h2>
                                子アプリ
                                <Button primary onclick={() => {
                                    omu.server.apps.remove(...children.map(([,app]) => app));
                                    $selectedApp = $selectedApp;
                                }}>
                                    すべて削除
                                </Button>
                            </h2>
                            {#each children as [id, app] (id)}
                                <div class="entry">
                                    <AppInfo {app} />
                                    <Button primary onclick={() => {
                                        omu.server.apps.remove(app);
                                        $selectedApp = $selectedApp;
                                    }}>
                                        <Tooltip>
                                            削除
                                        </Tooltip>
                                        削除
                                        <i class="ti ti-x"></i>
                                    </Button>
                                </div>
                            {/each}
                        </div>
                    {/if}
                {/await}
                <h2>JSON</h2>
                <pre>{JSON.stringify(App.serialize($selectedApp), null, 2)}</pre>
            {/if}
        </div>
    {/snippet}
</Screen>

<style lang="scss">
    .container {
        position: relative;
        height: 100%;
        width: 100%;
        padding: 2rem 0.75rem;
        padding-bottom: 0;
        display: flex;
        flex-direction: column;
        text-align: start;
        color: var(--color-text);
    }

    h3 {
        color: var(--color-1);
        font-size: 1.5rem;
        margin-left: 0.5rem;
        padding-bottom: 0.5rem;
        color: var(--color-text);

        > small {
            font-size: 1rem;
        }
    }

    .actions {
        display: flex;
        justify-content: flex-end;
        margin: 1rem 0.5rem;
    }

    .children {
        max-height: 24rem;
        overflow: hidden;

        > .entry {
            display: flex;
            align-items: center;
            gap: 1rem;
            background: var(--color-bg-2);
            padding: 0 1rem;
            padding-right: 1.25rem;
            margin-bottom: 0.25rem;
        }
    }

    .info {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        pointer-events: all;
        overflow-x: hidden;

        > .app {
            border-bottom: 2px solid var(--color-1);
            width: 100%;
        }
    }

    pre {
        text-align: left;
        background: var(--color-bg-2);
        padding: 1rem 1.5rem;
        color: var(--color-text);
    }

    h2 {
        margin-top: 4rem;
        margin-bottom: 1rem;
        text-align: start;
        color: var(--color-text);
        display: flex;
        justify-content: space-between;
    }

    .spin {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }

        100% {
            transform: rotate(360deg);
        }
    }

    ul {
        list-style: none;
        padding: 0;
        height: 100%;
    }
</style>
