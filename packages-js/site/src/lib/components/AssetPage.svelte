<script lang="ts" generics="T">
    import { page } from '$app/stores';
    import { Omu, type App } from '@omujs/omu';
    import { DisconnectPacket, DisconnectType } from '@omujs/omu/network/packet';
    import { client, setClient, Spinner } from '@omujs/ui';
    import { onMount } from 'svelte';

    export let asset: App;
    export let multiple = true;
    export let create: (omu: Omu) => T;

    let state: {
        type: 'connecting';
    } | {
        type: 'ready';
        omu: Omu;
        app: T;
    } | {
        type: 'disconnected';
        reason: DisconnectPacket | null;
    } = { type: 'connecting' };

    onMount(() => {
        let id = $page.url.searchParams.get('id') ?? '';
        const omu = new Omu(multiple ? asset.join(id) : asset);
        setClient(omu);
        const app = create(omu);

        omu.onReady(() => {
            state = { type: 'ready', omu, app };
        });
        omu.network.event.disconnected.listen((reason) => {
            state = {
                type: 'disconnected',
                reason,
            };
        });
        omu.start();
    });
</script>

{#if state.type === 'connecting'}
    <slot name="connecting">
        <div class="modal">
            <Spinner />
        </div>
    </slot>
{:else if state.type === 'ready'}
    <slot omu={state.omu} app={state.app} />
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
