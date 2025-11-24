<script lang="ts">
    import type { Models } from '@omujs/chat';

    import { omu } from './stores';
    import Tooltip from './Tooltip.svelte';
    import { applyOpacity } from './utils/class-helper.js';

    interface Props {
        role: Models.Role;
    }

    let { role }: Props = $props();
</script>

<div
    class:icon={role.iconUrl}
    style:color={role.color}
    style:background={role.color && applyOpacity(role.color, 0.1)}
>
    <Tooltip>
        <div class="tooltip">
            <div class="name">
                {role.name}
                {#if role.iconUrl}
                    <img
                        class="preview"
                        src={$omu.assets.proxy(role.iconUrl)}
                        alt="role icon"
                    />
                {/if}
            </div>
            {#if role.color}
                <small>
                    <span> Color: </span>
                    {role.color}
                </small>
            {/if}
            {#if role.isModerator}
                <small> Moderator </small>
            {/if}
            {#if role.isOwner}
                <small> Owner </small>
            {/if}
        </div>
    </Tooltip>
    <span class="icon">
        {#if role.iconUrl}
            <img src={role.iconUrl} alt="role" />
        {:else if role.isOwner}
            <i class="ti ti-crown-filled"></i>
        {:else if role.isModerator}
            <i class="ti ti-shield-filled"></i>
        {/if}
    </span>
</div>

<style lang="scss">
    div {
        display: flex;
        flex-direction: row;
        gap: 2px;
        align-items: baseline;
        width: fit-content;
        height: calc(1.4rem);
        margin-right: 5px;
        font-size: 0.8rem;
        font-weight: bold;
        line-height: 1rem;
        color: var(--color-1);
        white-space: nowrap;
    }

    .icon {
        width: 1.4rem;
        height: 1.4rem;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-1);

        > img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 100%;
        }

        > i {
            font-size: 0.8rem;
        }
    }

    .tooltip {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        height: fit-content;
        color: #fff;
    }

    .name {
        display: flex;
        flex-direction: row;
        align-items: center;
        height: fit-content;
        color: #fff;
    }

    .preview {
        height: 42px;
        padding: 2px;
        object-fit: contain;
    }

    small {
        display: flex;
        flex-direction: row;
        gap: 5px;
        align-items: center;
        padding: 2px;
        font-size: 0.6rem;
        font-weight: normal;
        color: var(--color-bg-1);
    }
</style>
