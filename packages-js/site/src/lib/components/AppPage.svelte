<script lang="ts">
    import { DisconnectType } from '@omujs/omu/network/packet/packet-types.js';
    import { client } from '@omujs/ui';
    import Spinner from '../../routes/app/archive/components/Spinner.svelte';

    let state: 'loading' | 'loaded' | DisconnectType = 'loaded';

    state = 'loading';
    client.subscribe((omu) => {
        if (!omu) return;
        omu.onReady(() => {
            state = 'loaded';
        });
        omu.network.event.disconnected.listen((reason) => {
            state = 'loading';
            if (reason) {
                state = reason.type;
                console.log(reason);
            }
        });
    });
</script>

<slot name="header" />
<slot />
{#if state === 'loading'}
    <div class="modal">
        <Spinner />
    </div>
{:else if state === DisconnectType.ANOTHER_CONNECTION}
    <div class="modal">
        <p>同じIDを持つアプリが接続されました</p>
        <small>このアプリを使うにはどちらかを閉じてください</small>
    </div>
{/if}

<style lang="scss">
    .modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: color-mix(in srgb, var(--color-bg-1) 95%, transparent 0%);
        color: var(--color-1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
    }
</style>
