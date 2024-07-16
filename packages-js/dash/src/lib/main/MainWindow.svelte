<script lang="ts">
    import { dashboard } from '$lib/client.js';
    import { TableList, Tooltip } from '@omujs/ui';
    import AppEntry from './AppEntry.svelte';
    import { page } from './stores.js';
</script>

<main>
    <div class="tabs">
        <button class="tab" on:click={() => ($page = 'http://localhost:5173/app/?hide=1')}>
            <i class="ti ti-search" />
            <span>アプリを探す</span>
            <i class="open ti ti-chevron-right" />
        </button>
        <button class="tab">
            <i class="ti ti-message" />
            <span>配信をつなげる</span>
            <i class="open ti ti-chevron-right" />
        </button>
        <button class="tab">
            <i class="ti ti-settings" />
            <span>設定</span>
            <i class="open ti ti-chevron-right" />
        </button>
        <div class="tab-group">
            <span>アプリ</span>
            <div class="buttons">
                <button>
                    <Tooltip>
                        <div class="tooltip">
                            <h3>アプリを追加</h3>
                            <small>新しいアプリを追加します</small>
                        </div>
                    </Tooltip>
                    <i class="ti ti-settings" />
                </button>
                <button>
                    <Tooltip>
                        <div class="tooltip">
                            <h3>アプリを並び替え</h3>
                            <small>アプリの並び順を変更します</small>
                        </div>
                    </Tooltip>
                    <i class="ti ti-chevron-down" />
                </button>
            </div>
        </div>
        <div class="list">
            <TableList table={dashboard.apps} component={AppEntry} />
        </div>
    </div>
    <div class="page">
        {#if $page}
            <iframe src={$page} title="" frameborder="0" allow="camera; microphone"></iframe>
        {/if}
    </div>
</main>

<style lang="scss">
    main {
        display: flex;
        flex-direction: row;
        height: 100%;
        background: var(--color-bg-1);
        font-weight: 600;
    }

    .tabs {
        display: flex;
        flex-direction: column;
        width: 300px;
        background: var(--color-bg-2);
        border-right: 1px solid var(--color-outline);
        padding: 1rem 0.5rem;
    }

    .tab {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 0 1rem;
        border: none;
        background: var(--color-bg-2);
        color: var(--color-1);
        width: 100%;
        font-size: 0.9rem;
        font-weight: 600;
        height: 3rem;

        > i {
            font-size: 1rem;
            margin-right: 1rem;
        }

        > .open {
            margin-left: auto;
            display: none;
        }

        &:hover {
            background: var(--color-bg-1);
            outline: 1px solid var(--color-1);
            outline-offset: -3px;
            transition: background 0.0621s;

            > .open {
                display: block;
                margin-right: 0rem;
                transition: margin 0.0621s;
            }
        }
    }

    .tab-group {
        display: flex;
        flex-direction: row;
        align-items: baseline;
        padding: 0.5rem 0rem;
        background: var(--color-bg-2);
        color: var(--color-1);
        border-bottom: 1px solid var(--color-outline);
        width: 100%;
        font-size: 0.85rem;
        padding-bottom: 0.75rem;
        margin-top: 1rem;
        padding-left: 1rem;

        > i {
            margin-left: 0.25rem;
        }

        > .buttons {
            margin-left: auto;

            > button {
                background: none;
                border: none;
                color: var(--color-1);
                font-size: 1rem;
                font-weight: 600;
                width: 2rem;
                height: 2rem;

                &:hover {
                    background: var(--color-1);
                    color: var(--color-bg-1);
                    border-radius: 4px;
                }
            }
        }
    }

    .page {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        background: var(--color-bg-1);

        iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
    }
</style>
