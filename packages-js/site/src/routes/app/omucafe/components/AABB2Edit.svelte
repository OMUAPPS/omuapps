<script lang="ts">
    import type { AABB2Like } from '$lib/math/aabb2.js';
    import { Tooltip } from '@omujs/ui';

    export let bounds: AABB2Like;
</script>

<div class="edit">
    <span class="min">
        <i class="ti ti-arrow-up-left"></i>
        <label>
            <Tooltip>
                最小値X
            </Tooltip>
            <input type="number" value={bounds.min.x} onchange={({ currentTarget: { valueAsNumber } }) => {
                bounds = {
                    ...bounds,
                    min: {
                        ...bounds.min,
                        x: valueAsNumber,
                    },
                };
            }} />
        </label>
        <label>
            <Tooltip>
                最小値Y
            </Tooltip>
            <input type="number" value={bounds.min.y} onchange={({ currentTarget: { valueAsNumber } }) => {
                bounds = {
                    ...bounds,
                    min: {
                        ...bounds.min,
                        y: valueAsNumber,
                    },
                };
            }} />
        </label>
    </span>
    <span class="max">
        <i class="ti ti-arrow-down-right"></i>
        <label>
            <Tooltip>
                最大値X
            </Tooltip>
            <input type="number" value={bounds.max.x} onchange={({ currentTarget: { valueAsNumber } }) => {
                bounds = {
                    ...bounds,
                    max: {
                        ...bounds.max,
                        x: valueAsNumber,
                    },
                };
            }} />
        </label>
        <label>
            <Tooltip>
                最大値Y
            </Tooltip>
            <input type="number" value={bounds.max.y} onchange={({ currentTarget: { valueAsNumber } }) => {
                bounds = {
                    ...bounds,
                    max: {
                        ...bounds.max,
                        y: valueAsNumber,
                    },
                };
            }} />
        </label>
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
