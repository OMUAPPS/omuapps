<script lang="ts">
    import type { AppInstallRequest } from '@omujs/omu/extension/dashboard/packets.js';
    import AppInfo from '../AppInfo.svelte';
    import Screen from './Screen.svelte';
    import type { ScreenHandle } from './screen.js';

    export let screen: {
        handle: ScreenHandle;
        props: {
            request: AppInstallRequest;
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

<Screen {screen} title="app_install" disableClose>
    <div class="content">
        <AppInfo app={request.app} />
        <div>
            <button on:click={reject} class="reject">
                キャンセル
                <i class="ti ti-x" />
            </button>
            <button on:click={accept} class="accept">
                追加
                <i class="ti ti-check" />
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
        padding-bottom: 2rem;
    }

    button {
        padding: 0.5rem 1rem;
        margin-right: 1px;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--color-1);
        cursor: pointer;
        background: none;
        border: none;
        outline: none;
        outline-offset: -1px;

        &:hover {
            outline: 1px solid var(--color-1);
            outline-offset: -2px;
        }
    }

    .accept {
        color: var(--color-bg-2);
        background: var(--color-1);

        &:hover {
            outline: 1px solid var(--color-bg-2);
        }
    }

    .reject {
        margin-left: auto;

        &:hover {
            outline-offset: -2px;
        }
    }
</style>
