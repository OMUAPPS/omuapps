<script lang="ts">
    import { FileDrop } from '@omujs/ui';
    import { Game } from '../../core/game';
    import type { AttrImage } from './image';

    interface Props {
        attr?: AttrImage;
    }

    let { attr = $bindable() }: Props = $props();
</script>

{#if attr}
    <label>
        <FileDrop accept="image/*" handle={async (files) => {
            const file = files[0];
            attr.asset = await Game.getInstance().asset.uploadFile(file);
        }}>
            画像を変更
        </FileDrop>
    </label>
{/if}
