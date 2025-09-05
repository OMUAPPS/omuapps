<script lang="ts">
    import { DisconnectType } from '@omujs/omu/network/packet';
    import { client, Spinner } from '@omujs/ui';

    let state: 'loading' | 'loaded' | DisconnectType = 'loaded';

    state = 'loading';
    client.subscribe((omu) => {
        if (!omu) return;
        omu.onReady(() => {
            state = 'loaded';
        });
        omu.network.event.disconnected.listen((reason) => {
            if (reason) {
                if (
                    reason.type === DisconnectType.SHUTDOWN ||
                    reason.type === DisconnectType.CLOSE
                ) {
                    return;
                }
                state = reason.type;
            }
        });
    });
</script>

<slot />
{#if state === 'loading'}
    <div class="modal">
        <Spinner />
    </div>
{:else if state === DisconnectType.ANOTHER_CONNECTION}
    <div class="modal">
        <div class="info">
            <h1>同じアセットIDを持つアセットが接続されました</h1>
            <h2>これを使うにはどちらかを閉じて再読込してください</h2>
            <small>id={$client.app.id.path.join('.')}</small>
        </div>
    </div>
{:else if state === DisconnectType.PERMISSION_DENIED}
    <div class="modal">
        <div class="info">
            <h1>権限が拒否されました</h1>
            <small>id={$client.app.id.path.join('.')}</small>
        </div>
    </div>
{/if}

<style lang="scss">
    .modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        color: var(--color-1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;

        &:before {
            content: "";
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--color-bg-2);
            opacity: 0.9;
        }
    }

    .info {
        position: fixed;
        display: flex;
        flex-direction: column;
        align-items: start;
        justify-content: center;
        background: var(--color-bg-1);
        padding: 1rem 2rem;
    }

    small {
        margin-top: 1rem;
        font-size: 0.75rem;
    }
</style>
