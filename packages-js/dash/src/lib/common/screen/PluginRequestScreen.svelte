<script lang="ts">
    import type { PluginRequestPacket } from '@omujs/omu/extension/dashboard/packets.js';
    import AppInfo from '../AppInfo.svelte';
    import PackageEntry from './PackageEntry.svelte';
    import Screen from './Screen.svelte';
    import type { ScreenHandle } from './screen.js';

    export let screen: {
        handle: ScreenHandle;
        props: {
            request: PluginRequestPacket;
            resolve: (accept: boolean) => void;
        };
    };
    const { request, resolve } = screen.props;

    function accept() {
        resolve(true);
        screen.handle.pop();
    }

    function reject() {
        resolve(false);
        screen.handle.pop();
    }
</script>

<Screen {screen} title="plugin_request" disableClose>
    <span class="app-info">
        <AppInfo app={request.app} />
        <small>は以下のパッケージのインストールを要求しています。</small>
    </span>
    <div class="packages">
        {#each request.packages as entry}
            <ul>
                <PackageEntry {entry} />
            </ul>
        {/each}
    </div>
    <div class="actions">
        <small>
            プラグインはPC上のすべてのデータにアクセスできます。
            <i class="ti ti-alert-triangle" />
        </small>
        <button on:click={reject} class="reject">
            キャンセル
            <i class="ti ti-x" />
        </button>
        <button on:click={accept} class="accept">
            許可
            <i class="ti ti-check" />
        </button>
    </div>
</Screen>

<style lang="scss">
    .app-info {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: start;
        width: 100%;
        padding: 2rem 1.5rem;
        padding-bottom: 0rem;
        font-size: 14px;
        font-weight: 600;
        color: var(--color-1);
        border-bottom: 1px solid var(--color-outline);
        gap: 0.5rem;

        > small {
            margin: 0.5rem;
            margin-top: 0.25rem;
            margin-bottom: 1rem;
            color: var(--color-1);
        }
    }

    .packages {
        position: relative;
        flex: 1;
        width: 100%;

        > ul {
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;

            &::-webkit-scrollbar {
                width: 8px;
            }

            &::-webkit-scrollbar-track {
                background: var(--color-bg-2);
                border-radius: 1px;
            }

            &::-webkit-scrollbar-thumb {
                background: color-mix(in srgb, var(--color-1) 10%, transparent 0%);
                border: 1px solid var(--color-bg-2);
                border-radius: 1px;
            }

            &:hover {
                &::-webkit-scrollbar-thumb {
                    background: var(--color-1);
                }
            }

            @supports not selector(::-webkit-scrollbar) {
                & {
                    scrollbar-color: var(--color-1) var(--color-bg-2);
                }
            }
        }
    }

    .actions {
        display: flex;
        align-items: baseline;
        justify-content: end;
        gap: 0.5rem;
        padding: 0.5rem 0.621rem;
        width: 100%;
        border-top: 1px solid var(--color-outline);

        > small {
            margin-left: 0.5rem;
            margin-right: auto;
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--color-1);
        }

        > button {
            border: none;
            padding: 0.5rem 1rem;
            font-weight: 600;
            color: var(--color-1);
            background: var(--color-bg-1);
            cursor: pointer;
            border-radius: 4px;

            &.reject {
                color: var(--color-text);
                background: var(--color-bg-1);
            }

            &.accept {
                background: var(--color-1);
                color: var(--color-bg-1);

                &:disabled {
                    background: var(--color-bg-1);
                    color: var(--color-1);
                }
            }
        }
    }
</style>
