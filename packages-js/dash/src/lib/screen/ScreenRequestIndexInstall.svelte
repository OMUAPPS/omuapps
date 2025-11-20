<script lang="ts">
    import { omu } from '$lib/client';
    import Document from '$lib/common/Document.svelte';
    import type { PromptRequestIndexInstall, PromptResult } from '@omujs/omu/api/dashboard';
    import { ExternalLink, Tooltip } from '@omujs/ui';
    import Screen from './Screen.svelte';
    import about_index from './about_index.md?raw';
    import type { ScreenHandle } from './screen.js';

    interface Props {
        screen: {
        handle: ScreenHandle;
        props: {
            request: PromptRequestIndexInstall;
            resolve: (accept: PromptResult) => void;
        };
    };
    }

    let { screen }: Props = $props();
    const { request, resolve } = screen.props;
    const url = new URL(request.index_url);

    function accept() {
        resolve('accept');
        screen.handle.pop();
    }

    function reject() {
        resolve('deny');
        screen.handle.pop();
    }

    function block() {
        resolve('block');
        screen.handle.pop();
    }
</script>

<Screen {screen} disableClose>
    <div class="header">
        <h2>アプリ提供元を追加</h2>
    </div>
    <div class="info">
        <div class="provider">
            <p><ExternalLink href={url.hostname}>{url.hostname}</ExternalLink></p>
            <p>によって提供されています</p>
        </div>
        <div class="meta">
            {#if request.meta}
                <h2>{omu.i18n.translate(request.meta.name)}</h2>
                <p>{omu.i18n.translate(request.meta.note)}</p>
            {/if}
        </div>
    </div>
    <div class="actions">
        <button onclick={block} class="reject">
            <Tooltip>
                <p>この提供元の要求を拒否する</p>
            </Tooltip>
            禁止する
            <i class="ti ti-forbid-2"></i>
        </button>
        <button onclick={reject} class="reject">
            キャンセル
            <i class="ti ti-x"></i>
        </button>
        <button onclick={accept} class="accept">
            追加
            <i class="ti ti-check"></i>
        </button>
    </div>
    {#snippet info()}
        <Document source={about_index}  />
    {/snippet}
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

    h2 {
        font-weight: 600;
    }

    h3 {
        color: var(--color-1);
    }

    .info {
        position: relative;
        flex: 1;
        width: 100%;
        padding-top: 0.25rem;
        padding-bottom: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        overflow-y: auto;
        overflow-x: hidden;
        text-align: left;
        padding: 1rem 1rem;
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

    .meta {
        padding: 1rem;
        background: var(--color-bg-1);
    }

    h2 {
        color: var(--color-1);
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
            padding: 0.5rem 0rem;
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
