<script lang="ts">
    import AppInfo from '$lib/common/AppInfo.svelte';
    import type { AppInstallRequest } from '@omujs/omu/extension/dashboard/packets.js';
    import Screen from './Screen.svelte';
    import type { ScreenHandle } from './screen.js';

    export let screen: {
        handle: ScreenHandle;
        props: {
            request: AppInstallRequest;
            resolve: (accept: boolean) => void;
        };
    };
    const { request: { app }, resolve } = screen.props;

    function accept() {
        resolve(true);
        screen.handle.pop();
    }

    function reject() {
        resolve(false);
        screen.handle.pop();
    }
</script>

<Screen {screen} title="app_install" disableClose>
    <div class="content">
        <AppInfo {app} />
        <div class="actions">
            <button on:click={reject} class="reject">
                キャンセル
                <i class="ti ti-x"></i>
            </button>
            <button on:click={accept} class="accept">
                追加
                <i class="ti ti-check"></i>
            </button>
        </div>
    </div>
</Screen>

<style lang="scss">
    .content {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        padding-top: 4rem;
    }

    .actions {
        display: flex;
        gap: 0.5rem;
    }

    .actions {
        display: flex;
        align-items: baseline;
        justify-content: end;
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
