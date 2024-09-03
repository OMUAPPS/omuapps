<script lang="ts">
    import type { PermissionRequestPacket } from '@omujs/omu/extension/dashboard/packets.js';
    import type { PermissionLevel } from '@omujs/omu/extension/permission/permission.js';
    import { FlexRowWrapper, Tooltip } from '@omujs/ui';
    import AppInfo from '../AppInfo.svelte';
    import PermissionEntry from './PermissionEntry.svelte';
    import Screen from './Screen.svelte';
    import type { ScreenHandle } from './screen.js';

    export let screen: {
        handle: ScreenHandle;
        props: {
            request: PermissionRequestPacket;
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

    const LEVELS: Record<PermissionLevel, number> = {
        low: 0,
        medium: 1,
        high: 2,
    };

    const permissions = request.permissions.sort((a, b) => LEVELS[a.metadata.level] - LEVELS[b.metadata.level]).reverse().map((permission) => ({
        permission,
        accepted: permission.metadata.level === 'low',
    }));
</script>

<Screen {screen} title="permission_request" disableClose>
    <span class="text">
        <AppInfo app={request.app} />
        は以下の権限を要求しています。
    </span>
    <div class="permissions">
        <ul>
            {#each permissions as entry}
                <li>
                    <PermissionEntry permission={entry.permission} bind:accepted={entry.accepted} disabled={entry.permission.metadata.level === 'low'} />
                </li>
            {/each}
        </ul>
    </div>
    <FlexRowWrapper widthFull between baseline>
        <button on:click={reject} class="reject">
            キャンセル
            <i class="ti ti-x" />
        </button>
        <button on:click={accept} class="accept" disabled={!permissions.every((entry) => entry.accepted)}>
            {#if !permissions.every((entry) => entry.accepted)}
                <Tooltip>
                    すべての権限を許可してください
                </Tooltip>
            {/if}
            許可
            <i class="ti ti-check" />
        </button>
    </FlexRowWrapper>
</Screen>

<style lang="scss">
    button {
        padding: 8px 14px;
        margin-right: 1px;
        font-size: 16px;
        font-weight: 600;
        color: var(--color-1);
        cursor: pointer;
        background: var(--color-bg-2);
        border: none;
        outline: none;
        outline-offset: -1px;
    }

    .text {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 20px;
        font-size: 14px;
        font-weight: 600;
        color: var(--color-1);
    }

    .permissions {
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
        }
    }

    .accept {
        color: var(--color-bg-2);
        background: var(--color-1);

        &:hover {
            outline: 1px solid var(--color-bg-2);
        }

        &:disabled {
            color: var(--color-1);
            background: var(--color-bg-1);
            cursor: not-allowed;
        }
    }

    .reject {
        margin-left: auto;
        outline: 1px solid var(--color-1);

        &:hover {
            outline-offset: -2px;
        }
    }
</style>
