<script lang="ts" generics="T">
    import { createEventDispatcher } from 'svelte';

    export let options: {
        [key: string]: {
            value: T;
            label: string;
        };
    };
    export let defaultValue: string | undefined = undefined;

    const dispatch = createEventDispatcher<{
        change: { key: string; value: T };
        open: void;
        close: void;
    }>();

    function onChange() {
        if (!defaultValue) {
            return;
        }
        if (options[defaultValue] === undefined) {
            throw new Error(`Invalid default value: ${defaultValue}`);
        }
        dispatch('change', { key: defaultValue, value: options[defaultValue].value });
    }
</script>

<div class="combo-box">
    <select
        bind:value={defaultValue}
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
