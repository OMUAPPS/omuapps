<script lang="ts">
    import { omu } from '$lib/client';
    import { t } from '$lib/i18n/i18n-context';
    import MainWindow from '$lib/main/MainWindow.svelte';
    import { installed } from '$lib/main/settings';
    import { checkUpdate, invoke, serverState, startProgress } from '$lib/tauri';
    import { Button, Spinner } from '@omujs/ui';
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
    import { netState, state } from './stores';

    onMount(async () => {
        await start();
    });

    $: {
        if ($serverState?.type === 'ServerStopped' && $state.type === 'connecting') {
            $state.reject({
                type: 'server_start_failed',
            });
        }
    }

    $: console.log('serverState', $serverState);

    async function start() {
        try {
            $state = { type: 'checking_update' };
            const update = await checkUpdate();
            if (update) {
                await new Promise<void>((resolve) => {
                    $state = { type: 'update', update, resolve };
                });
            }
            if (!$installed) {
                await new Promise<void>((accept) => {
                    $state = { type: 'agreements', accept };
                });
            }

            $state = { type: 'starting' };
            await invoke('start_server');

            await new Promise<void>((resolve, reject) => {
                $state = { type: 'connecting', reject };
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
            if (!$installed) {
                await new Promise<void>((resolve) => {
                    $state = { type: 'add_channels', state: { type: 'idle' }, resolve };
                });
            }
            $state = { type: 'ready' };
            $installed = true;
        } catch (e) {
            console.error('Error during start:', e);
            $state = { type: 'restore' };
        }
    }

    async function retry() {
        await start();
    }
</script>

{#if $state.type === 'ready'}
    <MainWindow />
{:else}
    {#if $state.type === 'checking_update'}
        <InstallStepLayout>
            <h1>
                更新を確認中
                <Spinner />
            </h1>
        </InstallStepLayout>
    {:else if $state.type === 'agreements'}
        <InstallStepLayout>
            <div class="header">
                <h1>利用規約</h1>
                <small>使用するにあたって</small>
            </div>
            <div class="actions">
                <Button onclick={$state.accept} primary>
                    インストールを開始
                </Button>
            </div>

            <Agreements slot="hint" />
        </InstallStepLayout>
    {:else if $state.type === 'starting'}
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
    {:else if $state.type === 'connecting'}
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
    {:else if $state.type === 'add_channels'}
        <InstallStepLayout>
            <div class="header">
                <h1>
                    {#if $state.state.type === 'result'}
                        チャンネルを選択
                    {:else}
                        チャンネルを追加
                    {/if}
                </h1>
                <small>
                    チャットの機能で使用するチャンネルを追加します。
                </small>
            </div>
            <InstallStepAddChannels bind:state={$state.state} resolve={$state.resolve} />
            <InstallStepAddChannelsHint bind:state={$state.state} slot="hint" />
        </InstallStepLayout>
    {:else if $state.type === 'update'}
        <InstallStepLayout>
            <div class="title">
                <h1>更新があります</h1>
                <small>バージョン {$state.update.version} が利用可能です。</small>
            </div>

            <div class="actions">
                <InstallStepUpdate bind:state={$state} />
            </div>
            <StepUpdateHint update={$state.update} slot="hint" />
        </InstallStepLayout>
    {:else if $state.type === 'restore'}
        <InstallStepLayout>
            <div class="title">
                <h1>起動に失敗しました</h1>
                <small>環境を再構築するか、アプリケーションを再起動してください。</small>
            </div>
            <RestoreActions {retry} />
        </InstallStepLayout>
    {:else}
        <pre>
            {JSON.stringify($state, null, 2)}
        </pre>
    {/if}
{/if}

<style lang="scss">
    h1 {
        font-size: 1.421rem;
        margin-bottom: 0;
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
