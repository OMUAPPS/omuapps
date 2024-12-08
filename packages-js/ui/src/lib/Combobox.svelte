<script lang="ts" generics="T">
    import { createEventDispatcher } from 'svelte';

    export let options: {
        [key: string]: {
            value: T;
            label: string;
        };
    };
    export let value: T;
    $: key = Object.keys(options).find((key) => options[key].value === value);

    const dispatch = createEventDispatcher<{
        change: { key: string; value: T };
        open: void;
        close: void;
    }>();

    function onChange(event: Event & {
        currentTarget: EventTarget & HTMLSelectElement;
    }) {
        const key = event.currentTarget.value;
        value = options[key].value;
        dispatch('change', { key, value });
    }
</script>

<div class="combo-box">
    <select
        value={key}
        on:change={(event) => onChange(event)}
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
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--color-1);
        background: var(--color-bg-2);
        outline: 1px solid var(--color-outline);
        border: none;
        cursor: pointer;

        &:focus-within {
            outline: 1px solid var(--color-1);
        }
    }
</style>
