<script lang="ts">
    import type { Fixed } from '../../game/behavior/fixed.js';
    import TransformEdit from '../TransformEdit.svelte';

    export let fixed: Fixed;
</script>

<div class="behavior">
    <h3>固定</h3>
    <TransformEdit bind:transform={fixed.transform} />
</div>

<style lang="scss">
    .behavior {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
</style>
