<script lang="ts">
    import { DisconnectType } from '@omujs/omu/network/packet/packet-types.js';
    import { client, Spinner } from '@omujs/ui';

    let state: 'loading' | DisconnectType | null = 'loading';
    let message: string | null = null;

    state = 'loading';
    client.subscribe((omu) => {
        if (!omu) return;
        omu.onReady(() => {
            state = null;
        });
        omu.network.event.disconnected.listen((reason) => {
            state = 'loading';
            if (!reason) return;
            state = reason.type;
            message = reason.message;
            console.log(reason);
        });
    });
</script>

<slot name="header" />
<main>
    <slot />
</main>
{#if state === 'loading'}
    <div class="modal">
        <Spinner />
    </div>
{:else if state === DisconnectType.ANOTHER_CONNECTION}
    <div class="modal">
        <p>同じIDを持つアプリが接続されました</p>
        <small>このアプリを使うにはどちらかを閉じてください</small>
    </div>
{:else if state === DisconnectType.PERMISSION_DENIED}
    <div class="modal">
        <p>権限がありませんでした</p>
        <small>{message}</small>
    </div>
{:else if state === DisconnectType.INVALID_ORIGIN}
    <div class="modal">
        <p>無効なオリジンです</p>
        <small>{message}</small>
    </div>
{:else if state === DisconnectType.INVALID_VERSION}
    <div class="modal">
        <p>無効なバージョンです</p>
        <small>{message}</small>
    </div>
{:else if state === DisconnectType.INVALID_TOKEN}
    <div class="modal">
        <p>無効な認証情報です</p>
        <small>{message}</small>
    </div>
{:else if state === DisconnectType.SERVER_RESTART}
    <div class="modal">
        <p>サーバーが再起動されました</p>
    </div>
{:else if state === DisconnectType.CLOSE}
    <div class="modal">
        <p>接続が切断されました</p>
        <button on:click={() => location.reload()}>再接続</button>
    </div>
{:else if state !== null}
    <div class="modal">
        <p>エラーが発生しました</p>
        <small>{JSON.stringify(state)}</small>
    </div>
{/if}

<style lang="scss">
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
