<script lang="ts">
    import type { Transform } from '../game/transform.js';

    export let transform: Transform;
</script>

<div class="transform">
    right
    <label>
        x
        <input type="number" step="0.01" bind:value={transform.right.x} />
    </label>
    <label>
        y
        <input type="number" step="0.01" bind:value={transform.right.y} />
    </label>
    up
    <label>
        x
        <input type="number" step="0.01" bind:value={transform.up.x} />
    </label>
    <label>
        y
        <input type="number" step="0.01" bind:value={transform.up.y} />
    </label>
    offset
    <label>
        x
        <input type="number" step="0.01" bind:value={transform.offset.x} />
    </label>
    <label>
        y
        <input type="number" step="0.01" bind:value={transform.offset.y} />
    </label>
</div>

<style lang="scss">
    .transform {
        display: flex;
        flex-direction: column;
    }
</style>
