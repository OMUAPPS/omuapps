<script lang="ts">
    import { Tooltip } from '@omujs/ui';
    import type { RouletteApp } from '../roulette-app.js';

    export let roulette: RouletteApp;
    const { state, entries } = roulette;
</script>

<div class="spin-button" class:spinning={$state.type === 'spinning'}>
    {#if $state.type === 'idle' || $state.type === 'recruiting'}
        {@const empty = Object.keys($entries).length === 0}
        <button onclick={() => roulette.spin()} disabled={empty}>
            <Tooltip>
                {#if empty}
                    エントリーがありません
                {:else}
                    ルーレットを回す
                {/if}
            </Tooltip>
            {#if empty}
                エントリーを追加して回す
            {:else}
                回す
            {/if}
            <i class="ti ti-rotate-360"></i>
        </button>
    {:else if $state.type === 'spin-result'}
        <button onclick={() => roulette.stop()}>
            <Tooltip>このルーレットを終わる</Tooltip>
            終了
            <i class="ti ti-check"></i>
        </button>
    {:else}
        <button onclick={() => roulette.stop()}>
            <Tooltip>このルーレットを強制終了させる</Tooltip>
            強制終了
            <i class="ti ti-x"></i>
        </button>
    {/if}
</div>

<style lang="scss">
    .spin-button {
        > button {
            width: 100%;
            padding: 0.5rem 1rem;
            display: flex;
            justify-content: center;
            align-items: baseline;
            gap: 0.3rem;
            background: var(--color-bg-2);
            color: var(--color-1);
            outline: 1px solid var(--color-bg-2);
            outline-offset: -1px;
            font-weight: bold;
            cursor: pointer;
            border: none;

            &:disabled {
                background: var(--color-bg-1);
                color: var(--color-1);
                cursor: not-allowed;
            }

            &:hover {
                animation: spin-button 0.1621s forwards;
            }
        }

        &.spinning > button {
            background: var(--color-bg-1);
            color: var(--color-text);

            &:hover {
                animation: spin-button-spinning 0.1621s forwards;
            }
        }
    }

    @keyframes spin-button {
        10% {
            gap: 0rem;
        }

        25% {
            transform: scale(0.98);
        }

        50% {
            background: var(--color-1);
            color: var(--color-2);
            outline: 2px solid var(--color-bg-1);
            outline-offset: 3px;
        }

        100% {
            background: var(--color-1);
            color: var(--color-bg-1);
            outline-offset: 1px;
        }
    }

    @keyframes spin-button-spinning {
        10% {
            gap: 0rem;
        }

        25% {
            transform: scale(0.98);
        }

        50% {
            background: var(--color-bg-1);
            color: var(--color-1);
            outline: 2px solid var(--color-1);
            outline-offset: 3px;
        }

        100% {
            background: var(--color-bg-1);
            color: var(--color-text);
            outline-offset: 1px;
        }
    }
</style>
