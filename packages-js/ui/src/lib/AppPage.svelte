<script lang="ts">
    import { DisconnectReason } from '@omujs/omu';
    import type { NetworkStatus } from '@omujs/omu/network';
    import { DisconnectType } from '@omujs/omu/network/packet';
    import { Button, omu, Spinner } from '@omujs/ui';
    interface Props {
        header?: import('svelte').Snippet;
        children?: import('svelte').Snippet;
    }

    let { header, children }: Props = $props();

    let appState: {
        type: 'not_running';
    } | {
        type: 'connecting';
        status: NetworkStatus;
    } | {
        type: 'ready';
    } | {
        type: 'disconnected';
        reason?: DisconnectReason;
    } = $state({ type: 'not_running' });

    omu.subscribe(async (omu) => {
        if (!omu) return;
        if (!omu.running) {
            await new Promise<void>((resolve) => {
                omu.event.started.listen(() => resolve());
            });
        }
        omu.onReady(() => {
            appState = { type: 'ready' };
        });
        omu.network.event.status.listen((status) => {
            appState = { type: 'connecting', status };
            console.warn(status);
        });
        omu.network.event.disconnected.listen((reason) => {
            appState = { type: 'disconnected', reason };
        });
    });
</script>

<svelte:head>
    <style>
        :global(body) {
            background: transparent;
        }
    </style>
</svelte:head>

{@render header?.()}
<main>
    {@render children?.()}
</main>
{#if appState.type === 'not_running'}
    <div class="modal">
        <Spinner />
    </div>
{:else if appState.type === 'connecting'}
    <div class="modal">
        <Spinner />
        {#if appState.status.type === 'connecting'}
            <small>接続中...</small>
        {:else if appState.status.type === 'connected'}
            <small>認証中...</small>
        {:else if appState.status.type === 'reconnecting'}
            <small>
                再接続中... {(appState.status.attempt > 1 && `(${appState.status.attempt}回目)`) || ''}
            </small>
        {/if}
    </div>
{:else if appState.type === 'disconnected'}
    {#if !appState.reason}
        <div class="modal">
            <p>接続が切断されました</p>
            <Button primary onclick={() => location.reload()}>再接続</Button>
        </div>
    {:else if appState.reason.type === DisconnectType.ANOTHER_CONNECTION}
        <div class="modal">
            <p>同じIDを持つアプリが接続されました</p>
            <small>このアプリを使うにはどちらかを閉じてください</small>
        </div>
    {:else if appState.reason.type === DisconnectType.PERMISSION_DENIED}
        <div class="modal">
            <p>権限が拒否されました</p>
            <p class="message">{appState.reason.message}</p>
            <Button primary onclick={() => location.reload()}>再接続</Button>
        </div>
    {:else if appState.reason.type === DisconnectType.INVALID_ORIGIN}
        <div class="modal">
            <p>無効なオリジンです</p>
            <p class="message">{appState.reason.message}</p>
        </div>
    {:else if appState.reason.type === DisconnectType.INVALID_VERSION}
        <div class="modal">
            <p>無効なバージョンです</p>
            <p class="message">{appState.reason.message}</p>
        </div>
    {:else if appState.reason.type === DisconnectType.INVALID_TOKEN}
        <div class="modal">
            <p>無効な認証情報です</p>
            <p class="message">{appState.reason.message}</p>
        </div>
    {:else if appState.reason.type === DisconnectType.SERVER_RESTART}
        <div class="modal">
            <p>
                サーバーを再起動中
                <Spinner />
            </p>
            <small>再接続しています</small>
            <p class="message">{appState.reason.message}</p>
        </div>
    {:else if appState.reason.type === DisconnectType.INTERNAL_ERROR}
        <div class="modal">
            <p>内部エラーが発生しました</p>
            <p class="message">{appState.reason.message}</p>
        </div>
    {:else if appState.reason.type === DisconnectType.CLOSE}
        <div class="modal">
            <p>接続が切断されました</p>
            <button onclick={() => location.reload()}>再接続</button>
        </div>
    {:else}
        <div class="modal">
            <p>エラーが発生しました</p>
            <small>{JSON.stringify(appState)}</small>
        </div>
    {/if}
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
        gap: 1rem;
        font-size: 1.5rem;
    }

    small {
        font-size: 1rem;
        color: var(--color-text);
    }

    .message {
        position: absolute;
        top: 1rem;
        left: 2rem;
        font-size: 1rem;
    }
</style>
