<script lang="ts">
    import Document from '$lib/common/Document.svelte';
    import { t } from '$lib/i18n/i18n-context.js';
    import { App } from '@omujs/omu';
    import type { PromptRequestAppPermissions, PromptResult } from '@omujs/omu/api/dashboard';
    import { PermissionType, type PermissionLevel } from '@omujs/omu/api/permission';
    import AppAgreementScreen from './AppAgreementScreen.svelte';
    import EntryPermission from './_components/EntryPermission.svelte';
    import about_permission from './_docs/about_permission.md?raw';
    import type { ScreenHandle } from './screen.js';

    interface Props {
        handle: ScreenHandle;
        props: {
            request: PromptRequestAppPermissions;
            resolve: (accept: PromptResult) => void;
        };
    }

    let { handle, props }: Props = $props();
    const { request, resolve } = props;

    const LEVELS: Record<PermissionLevel, number> = {
        low: 0,
        medium: 1,
        high: 2,
    };

    const permissions = $state(request.permissions
        .sort((a, b) => LEVELS[a.metadata.level] - LEVELS[b.metadata.level])
        .reverse()
        .map((permission) => ({
            permission: PermissionType.deserialize(permission),
            accepted: permission.metadata.level === 'low',
        })));
</script>

{#snippet category(level: PermissionLevel, color: string)}
    {#if permissions.some(({ permission }) => permission.metadata.level === level)}
        <div class="category">
            <li>
                <span class="level" style:color>
                    {$t(`permission_level.${level}`)}
                    <small>
                        {$t(`permission_level.${level}_hint`)}</small>
                </span>
            </li>
            {#each permissions.filter(({ permission }) => permission.metadata.level === level) as entry, i (i)}
                <EntryPermission
                    permission={entry.permission}
                    bind:accepted={entry.accepted}
                    disabled={entry.permission.metadata.level === 'low'}
                />
            {/each}
        </div>
    {/if}
{/snippet}
<AppAgreementScreen
    app={App.deserialize(request.app)}
    {handle}
    {resolve}
>
    {@render category('high', 'rgb(203 24 24)')}
    {@render category('medium', 'rgb(197 129 0)')}
    {@render category('low', 'var(--color-1)')}
    {#snippet info()}
        <Document source={about_permission} />
    {/snippet}
</AppAgreementScreen>

<style lang="scss">
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
        margin-bottom: 1rem;
        padding-left: 1rem;
        border-left: 3px solid currentColor;

        > small {
            font-size: 0.6rem;
            color: var(--color-text);
        }
    }

    .category {
        position: relative;
        flex: 1;
        width: 100%;
        padding-bottom: 2rem;
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
</style>
