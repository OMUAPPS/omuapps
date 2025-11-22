<script lang="ts">

    import { chat, omu } from '$lib/client';
    import { t } from '$lib/i18n/i18n-context';
    import MainWindow from '$lib/main/MainWindow.svelte';
    import { installed, keepOpenOnBackground } from '$lib/main/settings';
    import { appWindow, backgroundRequested, checkUpdate, invoke, serverState, startProgress } from '$lib/tauri';
    import { DisconnectType } from '@omujs/omu/network/packet';
    import { Button, setGlobal, Spinner } from '@omujs/ui';
    import { error } from '@tauri-apps/plugin-log';
    import { onMount } from 'svelte';
    import Agreements from './_components/Agreements.svelte';
    import InstallStepAddChannels from './_components/InstallStepAddChannels.svelte';
    import InstallStepAddChannelsHint from './_components/InstallStepAddChannelsHint.svelte';
    import InstallStepConnectionProgress from './_components/InstallStepConnectionProgress.svelte';
    import InstallStepLayout from './_components/InstallStepLayout.svelte';
    import InstallStepStartProgress from './_components/InstallStepStartProgress.svelte';
    import InstallStepUpdate from './_components/InstallStepUpdate.svelte';
    import RestoreActions from './_components/RestoreActions.svelte';
    import StepUpdateHint from './_components/StepUpdateHint.svelte';
    import { appState, netState } from './stores';

    onMount(async () => {
        await start();
    });

    setGlobal({ omu, chat });

    $effect(() => {
        if ($serverState?.type === 'ServerStopped' && $appState.type === 'connecting') {
            $appState.reject({
                type: 'server_start_failed',
            });
            omu.stop();
        }
    });

    $effect(() => {
        if ($netState?.type === 'reconnecting') {
            if ($netState.attempt && $netState.attempt > 2) {
                $appState = { type: 'restore', message: omu.network.reason?.message };
                omu.stop();
            }
        } else if ($netState?.type === 'disconnected' && $netState.reason && $appState.type === 'ready') {
            if (![DisconnectType.SERVER_RESTART].includes($netState.reason.type)) {
                $appState = { type: 'restore', message: `${$netState.reason.type}: ${$netState.reason.message}` };
                omu.stop();
            }
        }
    });

    $effect(() => {
        console.log('serverState', $serverState);
    });

    async function start() {
        await installed.loaded;
        try {
            $appState = { type: 'checking_update' };
            const update = await checkUpdate();
            if (update) {
                await appWindow.show();
                await new Promise<void>((resolve) => {
                    $appState = { type: 'update', update, resolve };
                });
            }
            if (!$installed) {
                await new Promise<void>((accept) => {
                    $appState = { type: 'agreements', accept };
                });
            }

            $appState = { type: 'starting' };
            await invoke('start_server');

            let timeout = window.setTimeout(() => {
                error('Connection timeout');
                $appState = { type: 'restore', message: 'Connection timeout' };
            }, 1000 * 20);
            await new Promise<void>((resolve, reject) => {
                $appState = { type: 'connecting', reject };
                if (omu.running) {
                    omu.stop();
                }
                omu.start();
                omu.network.event.status.listen((status) => {
                    $netState = status;
                });
                omu.waitForReady().then(() => {
                    resolve();
                });
            });
            window.clearTimeout(timeout);
            if (!$installed) {
                await new Promise<void>((resolve) => {
                    $appState = { type: 'add_channels', state: { type: 'idle' }, resolve };
                });
            }
            $appState = { type: 'ready' };
            $installed = true;
            if ($backgroundRequested && !$keepOpenOnBackground) {
                console.log('Hiding window');
                await appWindow.hide();
            }
        } catch (e) {
            console.error('Error during start:', e);
            $appState = { type: 'restore', message: JSON.stringify(e, null, 2) };
            error(`Error during start: ${JSON.stringify(e)}`);
            await appWindow.show();
        }
    }

    async function retry() {
        await start();
    }
</script>

{#if $appState.type === 'ready'}
    <MainWindow />
{:else}
    {#if $appState.type === 'checking_update'}
        <InstallStepLayout>
            <h1>
                更新を確認中
                <Spinner />
            </h1>
        </InstallStepLayout>
    {:else if $appState.type === 'agreements'}
        <InstallStepLayout>
            <div class="header">
                <h1>利用規約</h1>
                <small>使用するにあたって</small>
            </div>
            <div class="actions">
                <Button onclick={$appState.accept} primary>
                    インストールを開始
                </Button>
            </div>

            {#snippet hint()}
                <Agreements />
            {/snippet}
        </InstallStepLayout>
    {:else if $appState.type === 'starting'}
        <InstallStepLayout>
            <div class="header">
                <h1>
                    {#if $installed}
                        起動中
                    {:else}
                        インストール中
                    {/if}
                    <Spinner />
                </h1>
                {#if $startProgress}
                    <small>
                        {$t(`setup.progress.${$startProgress.type}.${$startProgress.progress.type}`)}
                    </small>
                {/if}
            </div>
            <div class="progress">
                <InstallStepStartProgress />
            </div>
        </InstallStepLayout>
    {:else if $appState.type === 'connecting'}
        <InstallStepLayout>
            <div class="header">
                <h1>
                    接続中
                    <Spinner />
                </h1>
            </div>
            <div class="progress">
                <InstallStepConnectionProgress />
            </div>
        </InstallStepLayout>
    {:else if $appState.type === 'add_channels'}
        <InstallStepLayout>
            <div class="header">
                <h1>
                    {#if $appState.state.type === 'result'}
                        チャンネルを選択
                    {:else}
                        チャンネルを追加
                    {/if}
                </h1>
                <small>
                    チャットの機能で使用するチャンネルを追加します
                </small>
            </div>
            <InstallStepAddChannels bind:status={$appState.state} resolve={$appState.resolve} />
            {#snippet hint()}
                {#if $appState.type === 'add_channels'}
                    <InstallStepAddChannelsHint bind:state={$appState.state} />
                {/if}
            {/snippet}
        </InstallStepLayout>
    {:else if $appState.type === 'update'}
        <InstallStepLayout>
            <div class="title">
                <h1>更新があります</h1>
                <small>バージョン {$appState.update.version} が利用可能です。</small>
            </div>

            <div class="actions">
                <InstallStepUpdate bind:appState={$appState} />
            </div>
            {#snippet hint()}
                {#if $appState.type === 'update'}
                    <StepUpdateHint update={$appState.update} />
                {/if}
            {/snippet}
        </InstallStepLayout>
    {:else if $appState.type === 'restore'}
        <InstallStepLayout>
            <div class="title">
                <h1>起動に失敗しました</h1>
                <small>環境を再構築するか、アプリケーションを再起動してください。</small>
            </div>
            <RestoreActions {retry} message={$appState.message} />
        </InstallStepLayout>
    {:else}
        <pre>
            {JSON.stringify($appState, null, 2)}
        </pre>
    {/if}
{/if}

<style lang="scss">
    h1 {
        font-size: 1.421rem;
        margin-bottom: 0;
        color: var(--color-1);
    }

    .header {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .actions {
        display: flex;
        justify-content: space-between;
        margin-top: auto;
    }

    .progress {
        margin-top: auto;
    }
</style>
