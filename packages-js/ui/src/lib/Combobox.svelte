<script lang="ts" generics="T">
    import { createEventDispatcher } from 'svelte';

    export let options: {
        [key: string]: {
            value: T;
            label: string;
        };
    };
    export let value: T;
    export let key: string | null | undefined = Object.keys(options)[0];

    $: {
        const found = Object.keys(options).find((key) => options[key].value === value);
        if (found) {
            key = found;
        }
    }

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
        padding: 0.5rem 1rem;
        font-size: 0.721rem;
        font-weight: 600;
        color: var(--color-1);
        background: var(--color-bg-2);
        outline: 1px solid var(--color-outline);
        border-radius: 2px;
        border: none;
        cursor: pointer;

        &:focus-within {
            outline: 1px solid var(--color-1);
        }
    }
</style>
