<script lang="ts">
    import { onDestroy } from 'svelte';
    
    import { NetworkStatus } from '@omujs/omu/network/network.js';
    import { omu } from '../client.js';

    let status: NetworkStatus = omu.network.status;

    const unlisten = omu.network.event.status.listen((newStatus) => {
        status = newStatus;
    });
    onDestroy(unlisten);
</script>

<p class={status}>
    {#if status === NetworkStatus.CONNECTED}
        <i class="ti ti-bolt"></i>
        接続済み
        <span>
            {omu.network.address.host}:{omu.network.address.port}
            <small> に接続済み </small>
        </span>
    {:else if status === NetworkStatus.READY}
        <i class="ti ti-check"></i>
    {:else if status === NetworkStatus.CONNECTING}
        <i class="ti ti-reload"></i>
        接続中
        <span>
            {omu.network.address.host}:{omu.network.address.port}
            <small> に接続中… </small>
        </span>
    {:else if status === NetworkStatus.DISCONNECTED}
        <i class="ti ti-x"></i>
        接続されていません
        <span>
            {omu.network.address.host}:{omu.network.address.port}
            <small> に接続できませんでした </small>
        </span>
    {/if}
</p>

<style>
    p {
        height: 100%;
        font-size: 12px;
        font-weight: bold;
        color: rgb(0 0 0 / 50%);
    }

    .connected {
        color: var(--color-1);
    }

    .connecting {
        color: var(--color-1);
    }

    .reconnecting {
        color: #ff8c00;
    }

    .disconnected {
        color: #f00;
    }
</style>
