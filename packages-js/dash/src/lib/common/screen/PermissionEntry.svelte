<script lang="ts">
    import type { PermissionType } from '@omujs/omu/extension/permission/permission.js';
    import { Tooltip } from '@omujs/ui';
    import { omu } from '../../client.js';

    export let permission: PermissionType;
    export let accepted: boolean;
    export let disabled: boolean;
</script>

<button class:accepted on:click={() => (accepted = !accepted)} disabled={disabled}>
    <Tooltip>
        {#if permission.metadata.note}
            {omu.i18n.translate(permission.metadata.note)}
        {/if}
    </Tooltip>
    <div class="check" class:disabled class:accepted>
        {#if accepted}
            <i class="ti ti-check" />
        {:else}
            <i class="ti ti-check" />
        {/if}
    </div>
    <div class="info">
        <p class="name">
            {omu.i18n.translate(permission.metadata.name)}
            <span class="id">
                {permission.id.key()}
            </span>
        </p>
    </div>
</button>

<style lang="scss">
    button {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.65rem 1rem;
        margin: 2px 4px;
        font-weight: 600;
        color: var(--color-1);
        background: var(--color-bg-1);
        border: none;
        cursor: pointer;

        &:disabled {
            height: 2rem;
            color: var(--color-text);
            background: var(--color-bg-1);
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
            visibility: hidden;
        }

        &.accepted {
            background: var(--color-1);
            color: var(--color-bg-2);
            outline: none;
        }
    }

    button {
        &:hover {
            outline: 1px solid var(--color-1);

            > .check {
                outline: 1px solid var(--color-1);
                outline-offset: -1px;
            }
        }
    }
</style>
