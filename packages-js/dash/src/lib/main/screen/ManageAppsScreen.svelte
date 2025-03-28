<script lang="ts">
    import { dashboard } from '$lib/client.js';
    import Screen from '$lib/screen/Screen.svelte';
    import type { ScreenHandle } from '$lib/screen/screen.js';
    import { TableList } from '@omujs/ui';
    import { currentPage } from '../settings.js';
    import AppEntry from './AppEntry.svelte';

    export let screen: {
        handle: ScreenHandle;
        props: undefined;
    };
</script>

<Screen {screen} title="manage-apps">
    <div class="container">
        <h3>
            アプリ
            <small>
                {#await dashboard.apps.size()}
                    <i class="spin ti ti-dots" /> 件
                {:then count}
                    {count} 件
                {/await}
            </small>
        </h3>
        <ul class="apps">
            <TableList
                table={dashboard.apps}
                component={AppEntry}
                sort={(a, b) => {
                    if (`app-${a.id.key()}` === $currentPage) return -1;
                    if (`app-${b.id.key()}` === $currentPage) return 1;
                    return 0;
                }}
            />
        </ul>
    </div>
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
    }

    h3 {
        color: var(--color-1);
        font-size: 1.5rem;
        margin-left: 0.5rem;
        padding-bottom: 0.5rem;

        > small {
            font-size: 1rem;
        }
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
