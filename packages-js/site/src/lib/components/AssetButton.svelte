<script lang="ts">
    import { page } from '$app/stores';
    import { DragLink } from '@omujs/ui';
</script>

<DragLink
    href={() => {
        const url = new URL($page.url);
        url.pathname = `${url.pathname}asset`;
        url.searchParams.set('assetId', Date.now().toString());
        return url;
    }}
>
    <h3 slot="preview" class="preview">
        これをOBSにドロップ
        <i class="ti ti-upload" />
    </h3>
    <div class="drag">
        <i class="ti ti-drag-drop" />
        ここをOBSにドラッグ&ドロップ
    </div>
</DragLink>

<style lang="scss">
    .preview {
        padding: 10px 20px;
        background: var(--color-bg-2);
    }

    .drag {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        color: var(--color-1);
        background: var(--color-bg-2);
        outline: 2px solid var(--color-1);
        outline-offset: -2px;
        font-weight: bold;
        padding: 0.75rem;
        gap: 5px;
        cursor: grab;

        & > i {
            font-size: 20px;
        }

        &:hover {
            margin-left: 4px;
            outline: 2px solid var(--color-1);
            box-shadow: -4px 4px 0 2px var(--color-2);
            transition: 0.0621s;
        }
    }
</style>
