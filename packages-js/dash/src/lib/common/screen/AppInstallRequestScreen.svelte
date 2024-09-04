<script lang="ts">
    import type { AppInstallRequest } from '@omujs/omu/extension/dashboard/packets.js';
    import { Localized } from '@omujs/ui';
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
        <Localized text={app.metadata?.image} />
        <div class="actions">
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

    .actions {
        display: flex;
        gap: 0.5rem;
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
        color: var(--color-1);
        background: var(--color-bg-1);

        &.accept {
            background: var(--color-1);
            color: var(--color-bg-2);
        }
    
        &.reject {
            margin-left: auto;
        }
    }

</style>
