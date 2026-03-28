<script lang="ts">
    import { Checkbox } from '@omujs/ui';
    import type { AttrDragging } from './dragging';

    interface Props {
        attr?: AttrDragging;
    }

    let { attr = $bindable() }: Props = $props();
</script>

{#if attr}
    <label>
        有効
        <Checkbox bind:value={attr.active} />
    </label>
{/if}
