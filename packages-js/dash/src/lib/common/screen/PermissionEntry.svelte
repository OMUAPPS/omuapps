<script lang="ts">
    import type { PermissionType } from '@omujs/omu/extension/permission/permission.js';
    import { FlexColWrapper, FlexRowWrapper } from '@omujs/ui';
    import { omu } from '../../client.js';

    export let permission: PermissionType;
</script>

<div>
    <FlexColWrapper widthFull>
        <FlexRowWrapper widthFull between>
            <span>
                <i class="ti ti-eye" />
                {omu.i18n.translate(permission.metadata.name)}
            </span>
            <small>
                {permission.id.key()}
            </small>
        </FlexRowWrapper>
        {#if permission.metadata.note}
            <FlexRowWrapper widthFull between>
                <small>
                    {omu.i18n.translate(permission.metadata.note)}
                </small>
            </FlexRowWrapper>
        {/if}
    </FlexColWrapper>
</div>

<style>
    div {
        width: 90%;
        padding: 5px 10px;
        margin: 4px 10px;
        font-weight: 600;
        color: var(--color-1);
        background: var(--color-bg-1);
        border: 1px solid var(--color-outline);
    }
</style>
