<script lang="ts">
    import type { Holdable } from '../../game/behavior/holdable.js';
    
    export let holdable: Holdable;
</script>

<div class="behavior">
    {holdable}
</div>

<style lang="scss">
    .behavior {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
</style>
