<script lang="ts">
    import AppInfo from '$lib/common/AppInfo.svelte';
    import { App } from '@omujs/omu';
    import type { PromptRequestHttpPort, PromptResult } from '@omujs/omu/api/dashboard';
    import Screen from './Screen.svelte';
    import type { ScreenHandle } from './screen.js';

    export let screen: {
        handle: ScreenHandle;
        props: {
            request: PromptRequestHttpPort;
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
</script>

<Screen {screen} disableClose>
    <div class="screen">
        <div class="header">
            <h2>ネットワークアクセスの要求</h2>
            <small>以下のアプリケーションが使用するネットワークへのアクセスを要求しています</small>
        </div>
        <div class="content omu-scroll">
            <div class="app">
                <AppInfo app={App.deserialize(request.app)} />
            </div>
            {#each request.processes as process, index (index)}
                <div class="process">
                    <h3>{process.name} - {process.port}</h3>
                    <div class="info">
                        <small>場所:</small>
                        <p>{process.exe}</p>
                        <small>ポート番号:</small>
                        <p>{process.port}</p>
                    </div>
                </div>
            {/each}
        </div>
        <div class="actions">
            <button onclick={reject} class="reject">
                キャンセル
                <i class="ti ti-x"></i>
            </button>
            <button onclick={accept} class="accept">
                許可
                <i class="ti ti-check"></i>
            </button>
        </div>
    </div>
</Screen>

<style lang="scss">
    .screen {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding-top: 4rem;
        gap: 2rem;
        font-weight: 600;
        color: var(--color-text);
        font-size: 0.9rem;
    }

    .header {
        margin: 0 1rem;
    }

    .content {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        margin: 0 1rem;
    }

    .app {
        margin-bottom: 1rem;
    }

    h3 {
        color: var(--color-1);
        border-bottom: 1px solid var(--color-1);
        margin-bottom: 0.5rem;
    }

    .process {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        text-align: left;
        padding: 1rem;
        background: var(--color-bg-1);

        > .info {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            font-size: 0.8rem;
        }
    }

    .actions {
        margin-top: auto;
        display: flex;
        gap: 0.5rem;
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
