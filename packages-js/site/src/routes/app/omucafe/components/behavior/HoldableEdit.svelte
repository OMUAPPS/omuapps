<script lang="ts">
    import { Checkbox } from '@omujs/ui';
    import type { Holdable } from '../../game/behavior/holdable.js';
    
    export let behavior: Holdable;
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
