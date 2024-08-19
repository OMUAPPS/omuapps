<script lang="ts" generics="T">
    import { createEventDispatcher } from 'svelte';

    export let options: {
        [key: string]: {
            value: T;
            label: string;
        };
    };
    export let value: T;

    const dispatch = createEventDispatcher<{
        change: { key: string; value: T };
        open: void;
        close: void;
    }>();

    function onChange() {
        if (!value) {
            return;
        }
        const key = Object.keys(options).find((key) => options[key].value === value);
        if (!key) {
            return;
        }
        dispatch('change', { key, value });
    }
</script>

<div class="combo-box">
    <select
        bind:value
        on:change={() => onChange()}
        on:focus={() => dispatch('open')}
        on:blur={() => dispatch('close')}
    >
        {#each Object.entries(options) as [key, option]}
            <option value={key}>{option.label}</option>
        {/each}
    </select>
</div>

<style lang="scss">
    select {
        width: 100%;
        padding: 5px 5px;
        font-size: 14px;
        font-weight: 600;
        color: var(--color-1);
        background: var(--color-bg-2);
        outline: 1px solid var(--color-outline);
        border: none;
        outline: none;
        cursor: pointer;

        &:focus {
            outline: 2px solid var(--color-1);
        }
    }
</style>
