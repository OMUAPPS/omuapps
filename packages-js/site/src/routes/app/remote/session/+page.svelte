<script lang="ts">
    import { Omu } from '@omujs/omu';
    import { FrameConnection } from '@omujs/omu/network/frame-connection.js';
    import { setClient, Spinner } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { onMount } from 'svelte';
    import { REMOTE_APP } from '../app.js';
    import { RemoteApp } from '../remote-app.js';
    import SessionApp from './SessionApp.svelte';

    const params = BROWSER && new URLSearchParams(window.location.search) || new URLSearchParams('');
    let token = params.get('token') || undefined;
    let lan = params.get('lan') || undefined;
    let secure = params.get('secure') === 'true' || false;
    const omu = new Omu(REMOTE_APP, {
        token: token,
        address: BROWSER && {
            host: lan || window.location.hostname,
            port: 26423,
            secure,
        } || undefined,
        connection: BROWSER && new FrameConnection() || undefined,
    });
    const remote = new RemoteApp(omu, 'remote');
    setClient(omu);

    if (BROWSER) {
        onMount(async () => {
            omu.start();
        });
    }

    let state: {
        type: 'connecting';
    } | {
        type: 'connected';
    } | {
        type: 'ready';
    } | {
        type: 'disconnected';
        reason?: string;
    } = { type: 'connecting' };
    omu.onReady(() => {
        state = { type: 'ready' };
    });
    omu.network.event.status.listen((status) => {
        if (status.type === 'connected') {
            state = { type: 'connected' };
        } else if (status.type === 'disconnected') {
            state = { type: 'disconnected', reason: status.reason?.message || undefined };
        } else if (status.type === 'error') {
            state = { type: 'disconnected', reason: status.error.message || undefined };
        }
    });
</script>

<main>
    {#if state.type === 'connecting'}
        <div class="loading">
            <span>
                <Spinner />
                <div>接続中</div>
            </span>
        </div>
    {:else if state.type === 'connected'}
        <div class="loading">
            <span>
                <Spinner />
                <div>接続中</div>
            </span>
        </div>
    {:else if state.type === 'ready'}
        <SessionApp {omu} {remote} />
    {:else if state.type === 'disconnected'}
        <div class="loading">
            <span>
                <Spinner />
                <div>接続が切断されました</div>
            </span>
            {#if state.reason}
                <small>
                    {state.reason}
                </small>
            {/if}
        </div>
    {/if}
</main>

<style lang="scss">
    :global(body) {
        background: transparent !important;
    }

    main {
        position: fixed;
        inset: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        background: var(--color-bg-1);
        color: var(--color-1);
        // scale up
        $scale: 2;
        // transform: scale($scale);
        scale: $scale;
        transform-origin: 0 0;
        width: calc(100% / $scale);
        height: calc(100% / $scale);
    }

    .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        font-size: 1.5rem;

        > span {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
    }

    small {
        color: var(--color-text);
        font-size: 0.8rem;
    }
</style>
