<script lang="ts">
    import { DisconnectType } from '@omujs/omu/network/packet/packet-types.js';
    import { client } from '@omujs/ui';
    import Spinner from '../../routes/app/archive/components/Spinner.svelte';

    let state: 'loading' | 'loaded' | DisconnectType = 'loaded';
    let message: string | null = null;

    state = 'loading';
    client.subscribe((omu) => {
        if (!omu) return;
        omu.onReady(() => {
            state = 'loaded';
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
{:else if state === DisconnectType.CLOSE}
    <div class="modal">
        <p>接続が切断されました</p>
        <button on:click={() => location.reload()}>再接続</button>
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
