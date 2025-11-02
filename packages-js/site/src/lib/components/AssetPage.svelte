<script lang="ts">
    import { page } from '$app/stores';
    import { Omu, type App, type DisconnectReason } from '@omujs/omu';
    import { DisconnectType } from '@omujs/omu/network/packet';
    import { client, setClient, Spinner } from '@omujs/ui';
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

    const id = BROWSER && $page.url.searchParams.get('id');

    if (id) {
        const omu = new Omu(single ? asset : asset.join(id));
        setClient(omu);
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
        <div class="modal">
            <Spinner />
        </div>
    </slot>
{:else if state.type === 'disconnected'}
    {#if !state.reason}
        <div class="modal">
            <div class="info">
                <h1>切断されました</h1>
                <small>id={$client.app.id.path.join('.')}</small>
            </div>
        </div>
    {:else if state.reason.type === DisconnectType.ANOTHER_CONNECTION}
        <div class="modal">
            <div class="info">
                <h1>同じアセットIDを持つアセットが接続されました</h1>
                <h2>これを使うにはどちらかを閉じて再読込してください</h2>
                <small>id={$client.app.id.path.join('.')}</small>
            </div>
        </div>
    {:else if state.reason.type === DisconnectType.PERMISSION_DENIED}
        <div class="modal">
            <div class="info">
                <h1>権限が拒否されました</h1>
                <small>id={$client.app.id.path.join('.')}</small>
            </div>
        </div>
    {:else}
        <div class="modal">
            <div class="info">
                <h1>切断されました</h1>
                <h2>{state.reason.message}</h2>
                <small>id={$client.app.id.path.join('.')}</small>
            </div>
        </div>
    {/if}
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
