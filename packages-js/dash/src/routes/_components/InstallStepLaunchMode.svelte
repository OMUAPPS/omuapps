<script lang="ts">
    import { obs } from '$lib/client';
    import { Button, Spinner, Tooltip } from '@omujs/ui';
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
            <button onclick={() => installState = { type: 'select', mode: 'automatically' }} class:selected={installState.mode === 'automatically'}>
                <Tooltip>
                    OBSを起動するだけでアプリが使えるようになります
                </Tooltip>
                <p>自動起動</p>
                <i class="ti ti-check"></i>
            </button>
            <button onclick={() => installState = { type: 'select', mode: 'manually' }} class:selected={installState.mode === 'manually'}>
                <Tooltip>
                    OBSを起動した後に手動で起動するまでアプリは使えません
                </Tooltip>
                <p>手動起動</p>
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
        gap: 0.5rem;
        margin-top: 6rem;

        button {
            position: relative;
            flex: 1;
            padding: 0.75rem 1rem;
            padding-right: 4rem;
            border: none;
            background: var(--color-bg-1);
            color: var(--color-1);
            font-size: 0.9rem;
            font-weight: 600;
            border-radius: 1px;
            cursor: pointer;
            text-align: left;
            transform: translateX(1px);

            &:hover {
                outline: 2px solid var(--color-1);
                outline-offset: 0.1621rem;
                border-radius: 1px;
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
