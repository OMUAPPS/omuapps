<script lang="ts">
    import AppInfo from '$lib/common/AppInfo.svelte';
    import { t } from '$lib/i18n/i18n-context.js';
    import type { PermissionRequestPacket } from '@omujs/omu/extension/dashboard/packets.js';
    import type { PermissionLevel } from '@omujs/omu/extension/permission/permission.js';
    import { Tooltip } from '@omujs/ui';
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
    <span class="app-info">
        <AppInfo app={request.app} />
        <small>は以下の権限を要求しています。</small>
    </span>
    <div class="permissions">
        <ul>
            {#if permissions.some(({permission}) => permission.metadata.level === 'high')}
                <li><span class="level">{$t('permission_level.high')}<small>{$t('permission_level.high_hint')}</small></span></li>
                {#each permissions.filter(({permission}) => permission.metadata.level === 'high') as entry, i (i)}
                    <PermissionEntry permission={entry.permission} bind:accepted={entry.accepted} disabled={entry.permission.metadata.level === 'low'} />
                {/each}
            {/if}
            {#if permissions.some(({permission}) => permission.metadata.level === 'medium')}
                <li><span class="level">{$t('permission_level.medium')}<small>{$t('permission_level.medium_hint')}</small></span></li>
                {#each permissions.filter(({permission}) => permission.metadata.level === 'medium') as entry, i (i)}
                    <PermissionEntry permission={entry.permission} bind:accepted={entry.accepted} disabled={entry.permission.metadata.level === 'low'} />
                {/each}
            {/if}
            {#if permissions.some(({permission}) => permission.metadata.level === 'low')}
                <li><span class="level">{$t('permission_level.low')}<small>{$t('permission_level.low_hint')}</small></span></li>
                {#each permissions.filter(({permission}) => permission.metadata.level === 'low') as entry, i (i)}
                    <PermissionEntry permission={entry.permission} bind:accepted={entry.accepted} disabled={entry.permission.metadata.level === 'low'} />
                {/each}
            {/if}
        </ul>
    </div>
    <div class="actions">
        <button on:click={reject} class="reject">
            キャンセル
            <i class="ti ti-x"></i>
        </button>
        <button on:click={accept} class="accept" disabled={!permissions.every((entry) => entry.accepted)}>
            {#if !permissions.every((entry) => entry.accepted)}
                <Tooltip>
                    確認が必要な権限があります
                </Tooltip>
            {/if}
            許可
            <i class="ti ti-check"></i>
        </button>
    </div>
</Screen>

<style lang="scss">
    .app-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: start;
        width: 100%;
        padding: 2rem 3rem;
        padding-bottom: 0rem;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--color-1);
        border-bottom: 1px solid var(--color-outline);
        gap: 0.5rem;

        > small {
            margin: 0.5rem;
            margin-top: 0.25rem;
            margin-bottom: 1rem;
            color: var(--color-1);
        }
    }

    .level {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 0.5rem 1.25rem;
        font-weight: 600;
        font-size: 1rem;
        color: var(--color-1);
        text-align: left;

        > small {
            font-size: 0.6rem;
            color: var(--color-text);
        }
    }

    .actions {
        display: flex;
        align-items: end;
        justify-content: end;
        gap: 0.5rem;
        padding: 0.5rem 0.621rem;
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

    .permissions {
        position: relative;
        flex: 1;
        width: 100%;

        > ul {
            position: absolute;
            inset: 0;
            padding-top: 0.25rem;
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
                background: color-mix(in srgb, var(--color-1) 10%, transparent 0%);
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
    }
</style>
