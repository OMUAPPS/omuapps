<script lang="ts">
    import AppInfo from '$lib/common/AppInfo.svelte';
    import Document from '$lib/common/Document.svelte';
    import { t } from '$lib/i18n/i18n-context.js';
    import { devMode } from '$lib/main/settings';
    import { App } from '@omujs/omu';
    import type { PromptRequestAppPermissions, PromptResult } from '@omujs/omu/api/dashboard';
    import { PermissionType, type PermissionLevel } from '@omujs/omu/api/permission';
    import { ButtonMini, Tooltip } from '@omujs/ui';
    import PermissionEntry from './PermissionEntry.svelte';
    import Screen from './Screen.svelte';
    import about_permission from './about_permission.md?raw';
    import type { ScreenHandle } from './screen.js';

    export let screen: {
        handle: ScreenHandle;
        props: {
            request: PromptRequestAppPermissions;
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

    const LEVELS: Record<PermissionLevel, number> = {
        low: 0,
        medium: 1,
        high: 2,
    };

    const permissions = request.permissions
        .sort((a, b) => LEVELS[a.metadata.level] - LEVELS[b.metadata.level])
        .reverse()
        .map((permission) => ({
            permission: PermissionType.deserialize(permission),
            accepted: permission.metadata.level === 'low',
        }));
</script>

<Screen {screen} disableClose>
    <div class="header">
        <AppInfo app={App.deserialize(request.app)} />
        <p>は権限を要求しています</p>
    </div>
    <div class="permissions">
        {#if permissions.some(({ permission }) => permission.metadata.level === 'high')}
            <li>
                <span class="level">
                    {$t('permission_level.high')}
                    <small>
                        {$t('permission_level.high_hint')}</small>
                </span>
            </li>
            {#each permissions.filter(({ permission }) => permission.metadata.level === 'high') as entry, i (i)}
                <PermissionEntry
                    permission={entry.permission}
                    bind:accepted={entry.accepted}
                    disabled={entry.permission.metadata.level === 'low'}
                />
            {/each}
        {/if}
        {#if permissions.some(({ permission }) => permission.metadata.level === 'medium')}
            <li>
                <span class="level">
                    {$t('permission_level.medium')}
                    <small>
                        {$t('permission_level.medium_hint')}
                    </small>
                </span>
            </li>
            {#each permissions.filter(({ permission }) => permission.metadata.level === 'medium') as entry, i (i)}
                <PermissionEntry
                    permission={entry.permission}
                    bind:accepted={entry.accepted}
                    disabled={entry.permission.metadata.level === 'low'}
                />
            {/each}
        {/if}
        {#if permissions.some(({ permission }) => permission.metadata.level === 'low')}
            <li>
                <span class="level">
                    {$t('permission_level.low')}
                    <small>
                        {$t('permission_level.low_hint')}</small>
                </span>
            </li>
            {#each permissions.filter(({ permission }) => permission.metadata.level === 'low') as entry, i (i)}
                <PermissionEntry
                    permission={entry.permission}
                    bind:accepted={entry.accepted}
                    disabled={entry.permission.metadata.level === 'low'}
                />
            {/each}
        {/if}
    </div>
    <div class="actions">
        {#if $devMode}
            <ButtonMini onclick={() => {
                const keys = permissions
                    .map(({ permission }) => permission.id.key())
                    .join('\n');
                navigator.clipboard.writeText(keys);
            }}>
                <i class="ti ti-clipboard"></i>
            </ButtonMini>
        {/if}
        <button onclick={reject} class="reject">
            キャンセル
            <i class="ti ti-x"></i>
        </button>
        <button
            onclick={accept}
            class="accept"
            disabled={!permissions.every((entry) => entry.accepted)}
        >
            {#if !permissions.every((entry) => entry.accepted)}
                <Tooltip>確認が必要な権限があります</Tooltip>
            {/if}
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
