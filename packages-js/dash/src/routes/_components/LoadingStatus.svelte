<script lang="ts">
    import { invoke } from '$lib/tauri.js';
    import { Spinner } from '@omujs/ui';
    import { relaunch } from '@tauri-apps/plugin-process';
    import { type LoadingState } from '../+layout.svelte';
    import FailedActions from './FailedActions.svelte';

    export let status: LoadingState;
    export let set: (status: LoadingState) => void;

    async function restart() {
        set({ type: 'restart' });
        await invoke('stop_server');
        await relaunch();
    }

    async function cleanEnvironment() {
        set({ type: 'cleaning' });
        await invoke('clean_environment');
        await relaunch();
    }
</script>

<div class="status">
    {#if status.type === 'loading'}
        <div class="message">
            {status.message}
            <Spinner />
        </div>
    {:else if status.type === 'restart'}
        <div class="message">
            再起動中
            <Spinner />
        </div>
    {:else if status.type === 'cleaning'}
        <div class="message">
            環境を再構築中
            <Spinner />
        </div>
    {:else if status.type === 'failed'}
        <div class="message">
            {status.message}
            <i class="ti ti-alert-triangle"></i>
        </div>
        {#if status.details}
            <div class="details">{status.details}</div>
        {/if}
        <FailedActions {restart} {cleanEnvironment} />
    {:else if status.type === 'progress'}
        <div class="message">
            {status.message}
            <Spinner />
        </div>
        {#if status.details}
            <div class="details">{status.details}</div>
        {/if}
        {#if status.progress && status.total}
            <div class="progress">
                <div class="bar" style="width: {(status.progress / status.total) * 100}%"></div>
            </div>
            <div class="details">
                <span class="percentage">{Math.floor(status.progress / status.total * 100) || 0}%</span>
                <span class="progress">
                    {status.progress}
                    <i class="ti ti-slash"></i>
                    {status.total}
                </span>
            </div>
        {/if}
    {:else if status.type === 'disconnected'}
        <div class="message">
            切断されました
            <i class="ti ti-plug-connected-x"></i>
        </div>
        <div class="details">{status.packet.type}:{status.packet.message}</div>
        <FailedActions {restart} {cleanEnvironment} />
    {/if}
    <div class="debug">
        {JSON.stringify(status)}
    </div>
</div>

<style lang="scss">
    .status {
        position: relative;
        background: var(--color-bg-2);
        color: var(--color-1);
        width: 40rem;
        height: 24rem;
        outline: 1px solid var(--color-1);
        outline-offset: -0.5rem;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: flex-start;
        padding: 5rem 8rem;
        padding-top: 6.621rem;
        font-weight: 600;
        box-shadow: 2px 10px 1px rgba(0, 0, 0, 0.00621);
    }

    .debug {
        position: fixed;
        bottom: 1rem;
        right: 1rem;
        font-weight: 500;
        font-size: 0.8rem;
        color: var(--color-text);
        opacity: 0.621;
    }

    .message {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 1rem;
        font-size: 1.4rem;
    }

    .details {
        margin-bottom: 3rem;
        font-size: 0.8rem;
        color: var(--color-text);

        > .percentage {
            font-size: 1rem;
            margin-right: 0.5rem;
        }

        > .progress {
            font-size: 0.8rem;
            color: var(--color-text);
        }
    }

    .status > .progress {
        width: 100%;
        height: 4px;
        min-height: 4px;
        background: var(--color-bg-1);
        overflow: hidden;
        box-shadow: 2px 1px 1px rgba(0, 0, 0, 0.04);
        margin-bottom: 0.5rem;
    }

    .bar {
        height: 100%;
        background: var(--color-1);
        animation: bar-blink 1s infinite;
    }

    @keyframes bar-blink {
        20% {
            opacity: 0.5;
        }
        50% {
            opacity: 1;
        }
        90% {
            opacity: 0.7;
        }
    }
</style>
