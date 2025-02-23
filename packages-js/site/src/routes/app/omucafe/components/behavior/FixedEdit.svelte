<script lang="ts">
    import type { Fixed } from '../../game/behavior/fixed.js';
    
    export let fixed: Fixed;
</script>

<div class="behavior">
    {fixed}
</div>

<style lang="scss">
    .behavior {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
</style>
