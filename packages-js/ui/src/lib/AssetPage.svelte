<script lang="ts">
    import { BrowserTokenProvider, Omu, type App, type DisconnectReason } from '@omujs/omu';
    import { DisconnectType } from '@omujs/omu/network/packet';
    import { Spinner } from '@omujs/ui';
    import { BROWSER } from 'esm-env';

    export let asset: App;
    export let single = false;

    let state: {
        type: 'initializing';
        browser: boolean;
    } | {
        type: 'invalid_id';
    } | {
        type: 'initialized';
        omu: Omu;
    } | {
        type: 'connecting';
        omu: Omu;
    } | {
        type: 'ready';
        omu: Omu;
    } | {
        type: 'disconnected';
        omu: Omu;
        reason?: DisconnectReason;
    } = { type: 'initializing', browser: BROWSER };

    const id = BROWSER && new URLSearchParams(location.search).get('id');
    const isSessionPresent = BROWSER && new URLSearchParams(location.search).get(BrowserTokenProvider.TOKEN_PARAM_KEY);
    if (id) {
        const omu = new Omu(single ? asset : asset.join(id));
        state = { type: 'initialized', omu };

        omu.onReady(() => {
            state = { type: 'ready', omu };
        });
        omu.network.event.status.listen((netState) => {
            if (netState.type === 'connecting') {
                state = { type: 'connecting', omu };
            }
        });
        omu.network.event.disconnected.listen((reason) => {
            state = {
                type: 'disconnected',
                omu,
                reason,
            };
        });
    } else if (BROWSER) {
        state = { type: 'invalid_id' };
    }
</script>
{#if state.type === 'invalid_id'}
    <div class="modal">
        <div class="info">
            <h1>無効なアセットIDです</h1>
            <h2>URLに正しいアセットIDを指定してください</h2>
        </div>
    </div>
{:else if state.type !== 'initializing'}
    <slot omu={state.omu} />
{/if}
{#if state.type === 'connecting'}
    <slot name="connecting">
        <div class="loading">
            <Spinner />
        </div>
    </slot>
{:else if state.type === 'disconnected' && state.reason?.type !== DisconnectType.SERVER_RESTART}
    {@const { omu: { app: { metadata }, i18n } } = state}
    <div class="container">
        <div class="modal">
            {#if metadata}
                <div class="info">
                    {#if metadata.name}
                        {i18n.translate(metadata.name)}
                    {/if}
                </div>
            {/if}
            {#if !state.reason}
                <h1>切断されました</h1>
            {:else if state.reason.type === DisconnectType.ANOTHER_CONNECTION}
                <h1>同じIDを持つアセットが接続されました</h1>
                <small>ソースは複製できません。どちらかを閉じて再読込してください</small>
            {:else if state.reason.type === DisconnectType.PERMISSION_DENIED}
                <h1>権限が拒否されました</h1>
                <small>このソースを再読み込みしてください</small>
            {:else if state.reason.type === DisconnectType.APP_REMOVED}
                <h1>アプリが削除されました</h1>
                <small>このソースを削除することができます</small>
            {:else if state.reason.type === DisconnectType.INVALID_TOKEN}
                {#if isSessionPresent}
                    <h1>認証に失敗しました</h1>
                {:else}
                    <h1>認証情報がありません</h1>
                {/if}
                <small>このブラウザソースを削除し、もう一度追加し直してください</small>
            {:else}
                <h1>切断されました</h1>
            {/if}
        </div>
        {#if state.reason}
            <div class="error">
                <h2>エラーコード</h2>
                <pre>{state.reason.type}: {state.reason.message}</pre>
            </div>
        {/if}
    </div>
{/if}

<style lang="scss">
    .loading {
        position: fixed;
        inset: 0;
        color: var(--color-bg-2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 4rem;
    }

    .container {
        position: fixed;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: space-between;
    }

    .modal {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: flex-start;
        background: #444;
        color: #eee;
        padding: 2rem 2rem;

        > h1 {
            border-bottom: 0.25rem solid #eee;
            margin-bottom: 0.5rem;
            font-size: 2rem;
        }

        > small {
            font-size: 1.5rem;
        }
    }

    .info {
        background: #eee;
        color: #444;
        font-size: 1.5rem;
        padding: 0.5rem 1.5rem;
        margin-bottom: 1rem;
    }

    .error {
        background: #444;
        color: #eee;
        margin-top: auto;
        padding: 1rem 2rem;
    }

    pre {
        padding: 1rem 2rem;
        font-size: 1.5rem;
        line-break: anywhere;
        white-space: wrap;
        color: #ccc;
    }
</style>
