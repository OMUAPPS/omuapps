<script lang="ts">
    import { onDestroy } from 'svelte';

    import type { NetworkStatus } from '@omujs/omu/network';
    import { omu } from '../client.js';

    let status: NetworkStatus = omu.network.status;

    const unlisten = omu.network.event.status.listen((newStatus) => {
        status = newStatus;
    });
    onDestroy(unlisten);
</script>

<p class={status.type}>
    {#if status.type === 'connected'}
        <i class="ti ti-bolt"></i>
        接続済み
        <span>
            {omu.network.address.host}:{omu.network.address.port}
            <small> に接続済み </small>
        </span>
    {:else if status.type === 'ready'}
        <i class="ti ti-check"></i>
    {:else if status.type === 'connecting'}
        <i class="ti ti-reload"></i>
        接続中
        <span>
            {omu.network.address.host}:{omu.network.address.port}
            <small> に接続中… </small>
        </span>
    {:else if status.type === 'disconnected'}
        <i class="ti ti-x"></i>
        接続されていません
        <span>
            {omu.network.address.host}:{omu.network.address.port}
            <small> に接続できませんでした </small>
        </span>
    {:else if status.type === 'error'}
        <i class="ti ti-x"></i>
        接続されていません
        <span>
            {omu.network.address.host}:{omu.network.address.port}
            <small> に接続できませんでした </small>
        </span>
        <span>
            {status.error.message}
        </span>
    {/if}
</p>

<style>
    p {
        height: 100%;
        font-size: 0.75rem;
        font-weight: bold;
        color: var(--color-1);
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
