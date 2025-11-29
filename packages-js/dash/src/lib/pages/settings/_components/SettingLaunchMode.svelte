<script lang="ts">
    import { obs } from '$lib/client';
    import { Button } from '@omujs/ui';

    let installed = $state(await obs.checkInstalled());
    let isAutoLaunchEnabled = $derived(installed.launch_installed);
</script>

<h3>起動方法</h3>
<div class="modes">
    <button class:selected={isAutoLaunchEnabled} onclick={() => isAutoLaunchEnabled = true}>
        <p>
            自動起動
            <i class="ti ti-check"></i>
        </p>
        <small>OBSを起動するだけでアプリが使えるようになります</small>
    </button>
    <button class:selected={!isAutoLaunchEnabled} onclick={() => isAutoLaunchEnabled = false}>
        <p>
            手動起動
            <i class="ti ti-check"></i>
        </p>
        <small>OBSを起動した後に手動で起動するまでアプリは使えません</small>
    </button>
</div>
<div class="actions">
    {#if installed.launch_installed !== isAutoLaunchEnabled}
        <Button onclick={async () => {
            await obs.setInstall({
                script_active: true,
                launch_active: isAutoLaunchEnabled,
            });
            installed = await obs.checkInstalled();
        }} primary>
            適用
            <i class="ti ti-check"></i>
        </Button>
    {/if}
</div>

<style lang="scss">
    h3 {
        margin-bottom: 0.5rem;
        padding: 0.75rem;
        color: var(--color-1);

        &:not(:nth-child(2)) {
            border-top: 1px solid var(--color-outline);
            padding-top: 1rem;
        }
    }

    .modes {
        display: flex;
        justify-content: space-evenly;
        gap: 1rem;
    }

    p {
        border-bottom: 1px solid var(--color-1);
        padding-bottom: 0.25rem;
        margin-bottom: 0.5rem;
    }

    small {
        color: var(--color-text);
    }

    button {
        flex: 1;
        display: flex;
        align-items: flex-start;
        flex-direction: column;
        padding: 1rem 1rem;
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        cursor: pointer;
        background: var(--color-bg-1);
        color: var(--color-1);
        border: none;
        text-align: left;

        &.selected {
            background: var(--color-1);
            color: var(--color-bg-2);

            small {
                color: var(--color-bg-2);
            }

            p {
                border-bottom: 1px solid var(--color-bg-2);
                padding-bottom: 0.25rem;
                margin-bottom: 0.5rem;
            }

            .ti {
                display: inline;
            }
        }

        .ti {
            display: none;
        }
    }

    .ti {
        margin-left: auto;
    }

    .actions {
        margin-bottom: 2rem;
    }
</style>
