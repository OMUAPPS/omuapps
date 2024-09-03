<script lang="ts">
    import { t } from '$lib/i18n/i18n-context.js';
    import type { PermissionType } from '@omujs/omu/extension/permission/permission.js';
    import { Tooltip } from '@omujs/ui';
    import { omu } from '../../client.js';

    export let permission: PermissionType;
    export let accepted: boolean;
    export let disabled: boolean;

    function handleClick() {
        if (disabled) return;
        accepted = !accepted;
    }
</script>

<button class:accepted on:click={handleClick}>
    <Tooltip>
        {#if permission.metadata.note}
            {omu.i18n.translate(permission.metadata.note)}
        {/if}
    </Tooltip>
    <div class="check" class:disabled>
        {#if accepted}
            <i class="ti ti-check" />
        {:else}
            <i class="ti ti-plus" />
        {/if}
    </div>
    <div class="info">
        <p>
            {omu.i18n.translate(permission.metadata.name)}
        </p>
        <small>
            {$t(`permission_level.${permission.metadata.level}`)}
            <i class={$t(`permission_level.${permission.metadata.level}_icon`)} />
            <span class="id">
                {permission.id.key()}
            </span>
        </small>
    </div>
</button>

<style lang="scss">
    button {
        display: flex;
        align-items: center;
        gap: 1rem;
        width: 100%;
        padding: 0.65rem 1rem;
        margin: 0.1rem;
        font-weight: 600;
        color: var(--color-1);
        background: var(--color-bg-1);
        border: none;
        cursor: pointer;
    }

    .info {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.2rem;
        font-size: 0.9rem;
        font-weight: 600;

        > small {
            display: flex;
            align-items: center;
            width: 100%;

            > i {
                margin-left: 0.5rem;
            }

            > .id {
                margin-left: auto;
            }
        } 
    }

    .check {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border-radius: 4.5px;
        background: var(--color-bg-2);
        color: var(--color-text);
        outline: 1px solid var(--color-outline);

        &.disabled {
            visibility: hidden;
        }
    }
    

    .accepted {
        > .check {
            background: var(--color-1);
            color: var(--color-bg-2);
            outline: none;
        }
    }
</style>
