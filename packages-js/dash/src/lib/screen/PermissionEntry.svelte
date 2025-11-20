<script lang="ts">
    import { omu } from '$lib/client.js';
    import { t } from '$lib/i18n/i18n-context.js';
    import type { PermissionType } from '@omujs/omu/api/permission';
    import { Tooltip } from '@omujs/ui';

    interface Props {
        permission: PermissionType;
        accepted: boolean;
        disabled: boolean;
    }

    let { permission, accepted = $bindable(), disabled }: Props = $props();

    let note = $derived(permission.metadata.note && omu.i18n.translate(permission.metadata.note));
</script>

<button class:accepted onclick={() => (accepted = !accepted)} {disabled}>
    {#if note}
        <Tooltip>
            {note}
        </Tooltip>
    {:else}
        <Tooltip>
            {$t('general.no_description')}
        </Tooltip>
    {/if}
    <div class="check" class:disabled class:accepted>
        {#if accepted}
            <i class="ti ti-check"></i>
        {:else}
            <i class="ti ti-check"></i>
        {/if}
    </div>
    <p>{omu.i18n.translate(permission.metadata.name)}</p>
</button>

<style lang="scss">
    button {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1rem;
        margin: 2px 1rem;
        font-weight: 600;
        color: var(--color-1);
        background: var(--color-bg-1);
        border: none;
        cursor: pointer;

        &:hover {
            outline: 1px solid var(--color-1);
            outline-offset: -4px;

            > .check {
                outline: 1px solid var(--color-1);
                outline-offset: -1px;
            }
        }

        &:disabled {
            padding: 0.5rem 1rem;
            color: var(--color-text);
            background: var(--color-bg-2);
            cursor: initial;

            &:hover {
                outline: none;
                background: var(--color-bg-1);
            }
        }
    }

    .info {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.2rem;
        font-size: 0.9rem;
        font-weight: 600;
        flex: 1;
    }

    .name {
        width: 100%;
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        font-size: 0.8rem;
    }

    .id {
        margin-left: auto;
        font-size: 0.7rem;
        color: var(--color-text);
        font-weight: 600;
        opacity: 0.8;
    }

    .check {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border-radius: 4.5px;
        background: var(--color-bg-2);
        color: #bbb;
        outline: 1px solid var(--color-outline);

        &.disabled {
            display: none;
        }

        &.accepted {
            background: var(--color-1);
            color: var(--color-bg-2);
            outline: none;
        }
    }
</style>
