<script lang="ts">
    import type { AABB2Like } from '$lib/math/aabb2.js';

    export let bounds: AABB2Like;
</script>

<div class="edit">
    <span class="min">
        <i class="ti ti-arrow-up-left"></i>
        <label>
            <input type="number" value={bounds.min.x} on:change={({currentTarget: {valueAsNumber}}) => {
                bounds = {
                    ...bounds,
                    min: {
                        ...bounds.min,
                        x: valueAsNumber,
                    }
                }
            }}/>
        </label>
        <label>
            <input type="number" value={bounds.min.y} on:change={({currentTarget: {valueAsNumber}}) => {
                bounds = {
                    ...bounds,
                    min: {
                        ...bounds.min,
                        y: valueAsNumber,
                    }
                }
            }}/>
        </label>
    </span>
    <span class="max">
        <label>
            <input type="number" value={bounds.max.x} on:change={({currentTarget: {valueAsNumber}}) => {
                bounds = {
                    ...bounds,
                    max: {
                        ...bounds.max,
                        x: valueAsNumber,
                    }
                }
            }}/>
        </label>
        <label>
            <input type="number" value={bounds.max.y} on:change={({currentTarget: {valueAsNumber}}) => {
                bounds = {
                    ...bounds,
                    max: {
                        ...bounds.max,
                        y: valueAsNumber,
                    }
                }
            }}/>
        </label>
        <i class="ti ti-arrow-down-right"></i>
    </span>
</div>

<style>
    .edit {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 0.5rem;
        outline: 1px solid var(--color-outline);
    }

    label {
        margin: 0 1px;
        background: var(--color-bg-1);
    }

    input {
        width: 4rem;
        padding: 0;
        margin: 0;
        border: 0;
        background: none;
    }
</style>
