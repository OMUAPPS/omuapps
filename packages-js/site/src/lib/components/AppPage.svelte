<script lang="ts">
    import { type DisconnectReason } from '@omujs/omu';
    import { type NetworkStatus } from '@omujs/omu/network';
    import { DisconnectType } from '@omujs/omu/network/packet';
    import { client, Spinner } from '@omujs/ui';

    let state: {
        type: 'connecting'; status: NetworkStatus;
    } | {
        type: 'ready';
    } | {
        type: 'disconnected'; reason: DisconnectReason | undefined;
    } = { type: 'connecting', status: { type: 'connecting' } };

    client.subscribe((omu) => {
        if (!omu) return;
        omu.onReady(() => {
            state = { type: 'ready' };
        });
        omu.network.event.status.listen((status) => {
            state = { type: 'connecting', status };
        });
        omu.network.event.disconnected.listen((reason) => {
            if (!reason && state.type === 'disconnected') reason = state.reason;
            state = { type: 'disconnected', reason };
            console.warn(reason);
        });
    });
</script>

<slot name="header" />
<main>
    <slot />
</main>
{#if state.type === 'connecting'}
    <div class="modal">
        <Spinner />
        {#if state.status.type === 'connecting'}
            <small>接続中...</small>
        {:else if state.status.type === 'connected'}
            <small>認証中...</small>
        {:else if state.status.type === 'reconnecting'}
            <small>
                再接続中... {(state.status.attempt > 1 && `(${state.status.attempt}回目)`) || ''}
            </small>
        {/if}
    </div>
{:else if state.type === 'disconnected'}
    {#if !state.reason}
        <div class="modal">
            <p>接続が切断されました</p>
            <button on:click={() => location.reload()}>再接続</button>
        </div>
    {:else if state.reason.type === DisconnectType.ANOTHER_CONNECTION}
        <div class="modal">
            <p>同じIDを持つアプリが接続されました</p>
            <small>このアプリを使うにはどちらかを閉じてください</small>
        </div>
    {:else if state.reason.type === DisconnectType.PERMISSION_DENIED}
        <div class="modal">
            <p>権限がありませんでした</p>
            <small>{state.reason.message}</small>
        </div>
    {:else if state.reason.type === DisconnectType.INVALID_ORIGIN}
        <div class="modal">
            <p>無効なオリジンです</p>
            <small>{state.reason.message}</small>
        </div>
    {:else if state.reason.type === DisconnectType.INVALID_VERSION}
        <div class="modal">
            <p>無効なバージョンです</p>
            <small>{state.reason.message}</small>
        </div>
    {:else if state.reason.type === DisconnectType.INVALID_TOKEN}
        <div class="modal">
            <p>無効な認証情報です</p>
            <small>{state.reason.message}</small>
        </div>
    {:else if state.reason.type === DisconnectType.SERVER_RESTART}
        <div class="modal">
            <p>サーバーが再起動されました</p>
            <small>{state.reason.message}</small>
        </div>
    {:else if state.reason.type === DisconnectType.INTERNAL_ERROR}
        <div class="modal">
            <p>内部エラーが発生しました</p>
            <small>{state.reason.message}</small>
        </div>
    {:else if state.reason.type === DisconnectType.CLOSE}
        <div class="modal">
            <p>接続が切断されました</p>
            <button on:click={() => location.reload()}>再接続</button>
        </div>
    {:else}
        <div class="modal">
            <p>エラーが発生しました</p>
            <small>{JSON.stringify(state)}</small>
        </div>
    {/if}
{/if}

<style lang="scss">
    :global(body) {
        background: transparent;
    }

    main {
        position: relative;
        width: 100%;
        height: 100%;
    }

    .modal {
        position: fixed;
        display: flex;
        flex-direction: column;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: color-mix(in srgb, var(--color-bg-1) 95%, transparent 0%);
        color: var(--color-1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
    }

    small {
        font-size: 1rem;
    }
</style>
