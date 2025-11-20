<script lang="ts">
    import AppInfo from '$lib/common/AppInfo.svelte';
    import { App } from '@omujs/omu';
    import type { PromptRequestAppInstall, PromptResult } from '@omujs/omu/api/dashboard';
    import { Tooltip } from '@omujs/ui';
    import Screen from './Screen.svelte';
    import AppDescription from './_components/AppDescription.svelte';
    import type { ScreenHandle } from './screen.js';

    export let screen: {
        handle: ScreenHandle;
        props: {
            request: PromptRequestAppInstall;
            resolve: (accept: PromptResult) => void;
        };
    };
    const {
        request,
        resolve,
    } = screen.props;

    function accept() {
        resolve('accept');
        screen.handle.pop();
    }

    function reject() {
        resolve('deny');
        screen.handle.pop();
    }

    const app = App.deserialize(request.app);

    function updateScroll(element: HTMLDivElement) {
        const { scrollTop, scrollHeight, clientHeight } = element;
        scrolled = scrollHeight - clientHeight - scrollTop < 10;
    }

    let scrolled = false;
</script>

<Screen {screen} disableClose>
    <div class="header">
        <AppInfo {app} />
        <p>を追加しますか？</p>
    </div>
    <div class="content omu-scroll"
        use:updateScroll
        on:scroll={({ currentTarget }) => updateScroll(currentTarget)}
        on:resize={({ currentTarget }) => updateScroll(currentTarget)}>
        <div class="info">
            <h2>アプリ情報</h2>
            <small>詳細</small>
            <AppDescription {app} />
        </div>
        {#if Object.keys(request.dependencies).length > 0}
            <div class="dependencies">
                <h2>前提アプリ</h2>
                <small>インストールすると以下のアプリも同時に追加されます</small>
                {#each Object.entries(request.dependencies) as [id, dependency] (id)}
                    {@const dependencyApp = App.deserialize(dependency)}
                    <div class="dependency">
                        <AppInfo app={dependencyApp} />
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
            追加
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

    .content {
        padding-bottom: 4rem;
    }

    h2 {
        margin-top: 1.5rem;
        color: var(--color-1);
        text-align: left;
    }

    small {
        margin-bottom: 1rem;
        font-weight: 600;
        font-size: 0.8rem;
        text-align: left;
    }

    .info {
        padding: 0 1.621rem;
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

    .dependencies {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 0 1.621rem;
        border-top: 1px solid var(--color-outline);

        > .dependency {
            border-left: 2px solid var(--color-1);
            padding: 0 1rem;

            &:hover {
                background: var(--color-bg-1);
            }
        }
    }
</style>
