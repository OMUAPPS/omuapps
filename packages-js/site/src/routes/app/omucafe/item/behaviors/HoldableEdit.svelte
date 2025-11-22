<script lang="ts">
    import { Checkbox } from '@omujs/ui';
    import type { Holdable } from './holdable.js';

    interface Props {
        behavior: Holdable;
    }

    let { behavior = $bindable() }: Props = $props();
</script>

<div class="behavior">
    <div>
        編集時のみ
        <Checkbox bind:value={behavior.editOnly} />
    </div>
</div>

<style lang="scss">
    .behavior {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
</style>
