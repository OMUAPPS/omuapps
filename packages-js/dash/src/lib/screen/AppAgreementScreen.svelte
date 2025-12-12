<script lang="ts">
    import AppInfo from '$lib/common/AppInfo.svelte';
    import { App } from '@omujs/omu';
    import type { PromptResult } from '@omujs/omu/api/dashboard';
    import { Tooltip } from '@omujs/ui';
    import { onMount, type Snippet } from 'svelte';
    import Screen from './Screen.svelte';
    import type { ScreenHandle } from './screen.js';

    interface Props {
        handle: ScreenHandle;
        app: App;
        resolve: (accept: PromptResult) => void;
        children: Snippet<[]>;
        info?: Snippet<[]>;
        disabled?: { reason: string } | false | undefined;
    }

    let { handle, app, resolve, children, info, disabled }: Props = $props();

    function updateScroll(element: HTMLDivElement) {
        const { scrollTop, scrollHeight, clientHeight } = element;
        scrolled ||= scrollHeight - clientHeight - scrollTop < 10;
    }

    let scrolled = $state(false);
    let delayed = $state(false);

    onMount(() => {
        const timeout = setTimeout(() => {
            delayed = true;
        }, 621 / 2);
        return () => {
            clearTimeout(timeout);
        };
    });
</script>

<Screen {handle} {info} disableClose>
    <div class="header">
        <AppInfo app={app} />
    </div>
    <div class="content omu-scroll"
        use:updateScroll
        onscroll={({ currentTarget }) => updateScroll(currentTarget)}
        onresize={({ currentTarget }) => updateScroll(currentTarget)}>
        {@render children()}
    </div>
    <div class="actions">
        <button onclick={() => {
            resolve('deny');
            handle.close();
        }} class="reject">
            キャンセル
            <i class="ti ti-x"></i>
        </button>
        <button onclick={() => {
            resolve('accept');
            handle.close();
        }} class="accept" disabled={!scrolled || !delayed || !!disabled}>
            {#if disabled}
                <Tooltip>
                    {disabled.reason}
                </Tooltip>
            {:else if !scrolled}
                <Tooltip>
                    最後までスクロールしてください
                </Tooltip>
            {/if}
            許可
            <i class="ti ti-check"></i>
        </button>
    </div>
</Screen>

<style lang="scss">
    .header {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        width: 100%;
        padding: 1rem 1.25rem;
        padding-bottom: 1rem;
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-1);
        border-bottom: 1px solid var(--color-outline);
        gap: 0.5rem;
    }

    .content {
        padding: 2rem 0;
    }

    .actions {
        display: flex;
        margin-top: auto;
        margin-bottom: 2rem;
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
