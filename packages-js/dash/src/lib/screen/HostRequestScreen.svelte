<script lang="ts">
    import AppInfo from '$lib/common/AppInfo.svelte';
    import type { App } from '@omujs/omu';
    import type { HostRequest, UserResponse } from '@omujs/omu/api/dashboard';
    import Screen from './Screen.svelte';
    import type { ScreenHandle } from './screen.js';

    export let screen: {
        handle: ScreenHandle;
        props: {
            request: HostRequest;
            app: App;
            resolve: (accept: UserResponse) => void;
        };
    };
    const { request, app, resolve } = screen.props;

    function accept() {
        resolve({ type: 'ok', value: undefined });
        screen.handle.pop();
    }

    function reject() {
        resolve({ type: 'cancelled' });
        screen.handle.pop();
    }
</script>

<Screen {screen} title="host_request" disableClose>
    <div class="content">
        <AppInfo {app} />
        <p>が<code>{request.host}</code>を要求しています</p>
        <ul>
            <li>これを許可するとこのアプリは認証情報を使ったり無制限のアクセスが可能になります。</li>
            <li>信用できるアプリからの要求のみ許可してください。</li>
            <li>設定から再び無効にすることができます</li>
        </ul>
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
        padding-top: 4rem;
        gap: 2rem;
        font-weight: 600;
        color: var(--color-text);
        font-size: 0.9rem;
    }

    code {
        color: var(--color-1);
        margin: 0 0.25rem;
    }

    ul {
        text-align: left;
    }

    .actions {
        margin-top: auto;
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
