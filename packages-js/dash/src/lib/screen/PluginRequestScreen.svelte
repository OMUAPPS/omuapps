<script lang="ts">
    import AppInfo from '$lib/common/AppInfo.svelte';
    import type { PluginRequestPacket } from '@omujs/omu/api/dashboard';
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

<Screen {screen} disableClose>
    <div class="header">
        <AppInfo app={request.app} />
        <small>は以下のプラグインのインストールを要求しています。</small>
    </div>
    <div class="packages">
        <p class="warning">
            <i class="ti ti-alert-triangle"></i>
            プラグインはPC上のすべてのデータにアクセスできます。
        </p>
        {#each request.packages as entry, index (index)}
            <PackageEntry {entry} />
        {/each}
    </div>
    <div class="actions">
        <button on:click={reject} class="reject">
            キャンセル
            <i class="ti ti-x"></i>
        </button>
        <button on:click={accept} class="accept">
            許可
            <i class="ti ti-check"></i>
        </button>
    </div>
</Screen>

<style lang="scss">
    .header {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        width: 100%;
        padding: 2rem 1.25rem;
        padding-bottom: 1rem;
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-1);
        border-bottom: 1px solid var(--color-outline);
        gap: 0.5rem;
    }

    .packages {
        display: flex;
        flex-direction: column;
        gap: 0.621rem;
        padding: 2rem 1rem;
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
            background: color-mix(
                in srgb,
                var(--color-1) 10%,
                transparent 0%
            );
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

    .warning {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--color-text);
        background: var(--color-bg-1);
        border-radius: 4px;
        text-align: left;
    }
    .actions {
        display: flex;
        margin-top: auto;
        margin-bottom: 4rem;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        width: 100%;
        border-top: 1px solid var(--color-outline);

        > button {
            border: none;
            padding: 0.5rem 1rem;
            font-weight: 600;
            color: var(--color-1);
            background: var(--color-bg-1);
            cursor: pointer;
            border-radius: 4px;
            flex: 1;

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
