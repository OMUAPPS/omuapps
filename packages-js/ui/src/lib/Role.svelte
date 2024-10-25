<script lang="ts">
    import type { models } from '@omujs/chat';

    import { applyOpacity } from '$lib/utils/class-helper.js';
    import FlexColWrapper from './FlexColWrapper.svelte';
    import FlexRowWrapper from './FlexRowWrapper.svelte';
    import Tooltip from './Tooltip.svelte';
    import { client } from './stores.js';

    export let role: models.Role;
</script>

<div
    class:icon={role.iconUrl}
    style:color={role.color}
    style:background={role.color && applyOpacity(role.color, 0.1)}
>
    {#if role.iconUrl}
        <img src={role.iconUrl} alt="role icon" />
    {:else}
        {#if role.isOwner}
            <i class="ti ti-crown"></i>
        {:else if role.isModerator}
            <i class="ti ti-shield"></i>
        {/if}
        {role.name}
    {/if}
    <Tooltip>
        <FlexColWrapper>
            <FlexRowWrapper gap alignItems="center">
                {role.name}
                {#if role.iconUrl}
                    <img class="preview" src={$client.assets.proxy(role.iconUrl)} alt="role icon" />
                {/if}
            </FlexRowWrapper>
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
        </FlexColWrapper>
    </Tooltip>
</div>

<style>
    div {
        display: flex;
        flex-direction: row;
        gap: 2px;
        align-items: center;
        width: fit-content;
        height: calc(1.4rem);
        padding: 4px 8px;
        margin-right: 5px;
        font-size: 0.8rem;
        font-weight: bold;
        line-height: 1rem;
        color: var(--color-1);
        white-space: nowrap;

        &.icon {
            padding: 0;
        }

        &:not(.icon) {
            background: var(--color-1);
            color: var(--color-bg-2);
        }
    }

    img {
        height: 100%;
        vertical-align: middle;
        object-fit: contain;
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
        color: var(--color-2);
    }
</style>
