<script lang="ts">
    import Document from '$lib/common/Document.svelte';
    import type { PromptRequestIndexInstall, PromptResult } from '@omujs/omu/api/dashboard';
    import Screen from './Screen.svelte';
    import about_permission from './about_permission.md?raw';
    import type { ScreenHandle } from './screen.js';

    export let screen: {
        handle: ScreenHandle;
        props: {
            request: PromptRequestIndexInstall;
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
    <div class="header">
        <p>{request.index_url}</p>
    </div>
    <div class="permissions">
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
    <Document source={about_permission} slot="info" />
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

    .level {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        font-weight: 600;
        font-size: 1rem;
        color: var(--color-1);
        padding: 0.5rem 0.25rem;
        margin: 0 1rem;
        text-align: left;
        margin-top: 2rem;
        margin-bottom: 0.5rem;
        border-bottom: 1px solid var(--color-outline);

        > small {
            font-size: 0.6rem;
            color: var(--color-text);
        }
    }

    .permissions {
        position: relative;
        flex: 1;
        width: 100%;
        padding-top: 0.25rem;
        padding-bottom: 1rem;
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
