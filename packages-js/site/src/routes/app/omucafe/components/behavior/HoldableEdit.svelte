<script lang="ts">
    import type { Holdable } from '../../game/behavior/holdable.js';
    
    export let behavior: Holdable;
</script>

<div class="behavior">
    {behavior}
</div>

<style lang="scss">
    .behavior {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
</style>
