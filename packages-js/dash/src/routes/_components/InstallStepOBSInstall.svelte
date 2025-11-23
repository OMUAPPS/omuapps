<script lang="ts">
    import { obs } from '$lib/client';
    import { Button, Spinner } from '@omujs/ui';
    import type { OBSInstallState } from '../stores';

    interface Props {
        installState: OBSInstallState;
        resolve: () => void;
    }

    let { installState = $bindable(), resolve }: Props = $props();

    async function install() {
        if (installState.type !== 'select') {
            throw new Error(`Invalid state: ${JSON.stringify(installState)}`);
        }
        const autoLaunch = installState.mode === 'automatically';
        installState = { type: 'installing' };
        await obs.setInstall({
            script_active: true,
            launch_active: autoLaunch,
        });
        resolve();
    }
</script>

<div class="step">
    {#if installState.type === 'select'}
        <div class="mode">
            <small>アプリを使用するには起動する必要があります</small>
            <button onclick={() => installState = { type: 'select', mode: 'automatically' }} class:selected={installState.mode === 'automatically'}>
                <h3>自動起動</h3>
                <small>OBSと同時に自動で起動します</small>
                <i class="ti ti-check"></i>
            </button>
            <button onclick={() => installState = { type: 'select', mode: 'manually' }} class:selected={installState.mode === 'manually'}>
                <h3>手動起動</h3>
                <small>OBSを起動した後に手動で起動しないとアプリは使えません</small>
                <i class="ti ti-check"></i>
            </button>
        </div>
        <small>「設定」→「一般」から設定できます</small>
        <div class="actions">
            <Button onclick={install} primary>
                選択を確定
                <i class="ti ti-check"></i>
            </Button>
        </div>
    {:else if installState.type === 'installing'}
        <Spinner />
    {/if}
</div>

<style lang="scss">
    .step {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        margin-top: auto;
    }

    .actions {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
    }

    .mode {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 4rem;

        button {
            position: relative;
            flex: 1;
            padding: 0.75rem 1.5rem;
            padding-right: 4rem;
            border: none;
            outline: 1px solid var(--color-1);
            background: var(--color-bg-1);
            border-radius: 2px;
            color: var(--color-1);
            border-radius: 1px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            text-align: left;
            transform: translateX(1px);

            &:hover {
                outline: 1px solid var(--color-1);
                transition: transform 0.0621s;
            }

            &:active {
                transform: translateX(0px);
            }

            > small {
                font-size: 0.8rem;
                color: var(--color-text);
            }

            > .ti-check {
                position: absolute;
                display: none;
                top: 50%;
                right: 1rem;
                transform: translateY(-50%);
                font-size: 1.25rem;
                color: var(--color-bg-2);
                transition: right 0.0621s;
            }

            &.selected {
                background: var(--color-1);
                color: var(--color-bg-2);
                filter: none;

                > .ti-check {
                    display: block;
                }

                > small {
                    color: var(--color-bg-1);
                }
            }
        }
    }
</style>
