<script lang="ts">
    import AppInfo from "$lib/common/AppInfo.svelte";
    import type { AppUpdateRequest } from "@omujs/omu/api/dashboard";
    import Screen from "./Screen.svelte";
    import type { ScreenHandle } from "./screen.js";

    export let screen: {
        handle: ScreenHandle;
        props: {
            request: AppUpdateRequest;
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

<Screen {screen} title="app_update" disableClose>
    <div class="screen">
        <h3>
            古いバージョン
            <i class="ti ti-package-export"></i>
        </h3>
        <div class="app-info old">
            <AppInfo app={request.oldApp} />
        </div>
        <h3>
            新しいバージョン
            <i class="ti ti-package-import"></i>
        </h3>
        <div class="app-info new">
            <AppInfo app={request.newApp} />
        </div>
        <div class="actions">
            <button on:click={reject} class="reject">
                キャンセル
                <i class="ti ti-x"></i>
            </button>
            <button on:click={accept} class="accept">
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
        align-items: center;
        gap: 0.5rem;
        padding-top: 1rem;
        width: 100%;
        height: 100%;
        overflow-y: auto;
    }

    .app-info {
        background: var(--color-bg-1);
        padding: 1rem 2rem;
        margin: 0 1rem;
        margin-top: 0.25rem;
        border-radius: 4px;
    }

    h3 {
        margin-top: 1rem;
        padding-bottom: 0.25rem;
        color: var(--color-1);
        border-bottom: 1px solid var(--color-outline);
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
            }
        }
    }
</style>
