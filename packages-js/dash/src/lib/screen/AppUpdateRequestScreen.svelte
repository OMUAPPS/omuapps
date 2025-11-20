<script lang="ts">
    import AppInfo from '$lib/common/AppInfo.svelte';
    import { App } from '@omujs/omu';
    import type { PromptRequestAppUpdate, PromptResult } from '@omujs/omu/api/dashboard';
    import { Tooltip } from '@omujs/ui';
    import Screen from './Screen.svelte';
    import type { ScreenHandle } from './screen.js';

    export let screen: {
        handle: ScreenHandle;
        props: {
            request: PromptRequestAppUpdate;
            resolve: (accept: PromptResult) => void;
        };
    };
    const { request, resolve } = screen.props;

    function accept() {
        resolve('accept');
        screen.handle.pop();
    }

    function reject() {
        resolve('deny');
        screen.handle.pop();
    }

    function updateScroll(element: HTMLDivElement) {
        const { scrollTop, scrollHeight, clientHeight } = element;
        scrolled = scrollHeight - clientHeight - scrollTop < 10;
    }

    let scrolled = false;
</script>

<Screen {screen} disableClose>
    <div class="screen">
        <h1>アプリの更新があります</h1>
        <div
            class="content omu-scroll"
            use:updateScroll
            on:scroll={({ currentTarget }) => updateScroll(currentTarget)}
            on:resize={({ currentTarget }) => updateScroll(currentTarget)}
        >
            <h3>
                古いバージョン
                <i class="ti ti-package-export"></i>
            </h3>
            <div class="app-info old">
                <AppInfo app={App.deserialize(request.old_app)} />
            </div>
            <h3>
                新しいバージョン
                <i class="ti ti-package-import"></i>
            </h3>
            <div class="app-info new">
                <AppInfo app={App.deserialize(request.new_app)} />
            </div>
            {#if Object.keys(request.dependencies).length > 0}
                <h2>更新で必要になった前提アプリ</h2>
                <small>更新と同時にインストールされます</small>
                <div class="dependencies">
                    {#each Object.entries(request.dependencies) as [id, dependency] (id)}
                        <div class="app-info">
                            <AppInfo app={App.deserialize(dependency)} />
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
        <div class="actions">
            <button onclick={reject} class="reject">
                キャンセル
                <i class="ti ti-x"></i>
            </button>
            <button onclick={accept} class="accept" disabled={!scrolled}>
                {#if !scrolled}
                    <Tooltip>
                        最後までスクロールしてください
                    </Tooltip>
                {/if}
                更新
                <i class="ti ti-check"></i>
            </button>
        </div>
    </div>
</Screen>

<style lang="scss">
    .screen {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
    }

    .content {
        display: flex;
        flex: 1;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 4rem 0;
        overflow-y: auto;
    }

    .app-info {
        background: var(--color-bg-1);
        padding: 1rem 1.5rem;
        margin: 0 1rem;
        margin-top: 0.25rem;
        border-radius: 4px;
    }

    h1 {
        padding: 2rem 0;
        font-size: 1.5rem;
    }

    h1, h2, h3 {
        margin-top: 1rem;
        padding-bottom: 0.25rem;
        color: var(--color-1);
        border-bottom: 1px solid var(--color-outline);
    }

    h2 {
        margin-top: 2rem;
    }

    .actions {
        display: flex;
        align-items: baseline;
        justify-content: end;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        margin-top: auto;
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
