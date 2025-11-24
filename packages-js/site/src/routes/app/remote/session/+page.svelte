<script lang="ts">
    import { Omu } from '@omujs/omu';
    import { FrameTransport } from '@omujs/omu/network';
    import { setGlobal, Spinner } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { onMount } from 'svelte';
    import { REMOTE_APP } from '../app.js';
    import { RemoteApp } from '../remote-app.js';
    import SessionApp from './SessionApp.svelte';

    const params =
        (BROWSER && new URLSearchParams(window.location.search)) ||
            new URLSearchParams('');
    let token = params.get('token') || undefined;
    let lan = params.get('lan') || undefined;
    let secure = params.get('secure') === 'true' || false;
    const omu = new Omu(REMOTE_APP, {
        token: token,
        address:
            (BROWSER && {
                host: lan || window.location.hostname,
                port: 26423,
                secure,
            }) ||
                undefined,
        transport: (BROWSER && new FrameTransport()) || undefined,
    });
    const remote = new RemoteApp(omu, 'remote');
    setGlobal({ omu });

    if (BROWSER) {
        onMount(() => {
            omu.start();
        });
    }

    let state:
        | {
            type: 'connecting';
        }
        | {
            type: 'connected';
        }
        | {
            type: 'ready';
        }
        | {
            type: 'disconnected';
            reason?: string;
        } = { type: 'connecting' };
    omu.network.event.status.listen((status) => {
        if (status.type === 'connecting') {
            state = { type: 'connecting' };
            logs.push(
                `[connecting] connecting to ${omu.address.host}:${omu.address.port}`,
            );
        } else if (status.type === 'connected') {
            state = { type: 'connected' };
            logs.push(
                `[connected] connected to ${omu.address.host}:${omu.address.port}`,
            );
        } else if (status.type === 'reconnecting') {
            state = { type: 'connected' };
            logs.push(
                `[reconnecting] reconnecting to ${omu.address.host}:${omu.address.port}`,
            );
        } else if (status.type === 'disconnected') {
            state = {
                type: 'disconnected',
                reason: status.reason?.message || undefined,
            };
            logs.push(
                `[disconnected] disconnected from ${omu.address.host}:${omu.address.port}`,
            );
        } else if (status.type === 'ready') {
            state = { type: 'ready' };
            logs.length = 0;
        }
    });

    let logs: string[] = [];
</script>

<svelte:head>
    <meta name="viewport" content="width=device-width, user-scalable=no" />
</svelte:head>

<main>
    {#if state.type === 'ready'}
        <SessionApp {omu} {remote} />
    {:else}
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
        <ul>
            {#each logs as log, i (i)}
                <li>{log}</li>
            {/each}
        </ul>
    {/if}
</main>

<style lang="scss">
    :global(body) {
        background: transparent !important;
        font-size: 40px;
    }

    :global(html) {
        font-size: calc(100vw * 18 / 480);
    }

    main {
        position: fixed;
        inset: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        background: var(--color-bg-1);
        color: var(--color-1);
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
