<script lang="ts">
    import { createEventDispatcher, onDestroy } from 'svelte';

    export let value: string = '';
    export let placeholder: string = '';
    export let disabled: boolean = false;
    export let readonly: boolean = false;
    export let lazy: boolean = false;
    let inputValue: string = value;
    let timer: number | undefined;

    const eventDispatcher = createEventDispatcher<{
        input: string;
    }>();

    function handleChange(event: Event) {
        inputValue = (event.target as HTMLInputElement).value;
        if (!lazy) {
            value = inputValue;
            eventDispatcher('input', inputValue);
            return;
        }
        if (timer) {
            clearTimeout(timer);
        }
        timer = window.setTimeout(() => {
            value = inputValue;
            eventDispatcher('input', inputValue);
        }, 300);
    }

    function exit() {
        if (timer) {
            window.clearTimeout(timer);
        }
        value = inputValue;
    }

    onDestroy(() => {
        if (timer) {
            window.clearTimeout(timer);
        }
    });
</script>

<input
    class="input"
    type="text"
    {placeholder}
    value={inputValue}
    {disabled}
    {readonly}
    on:input={handleChange}
    on:blur={exit}
/>

<style lang="scss">
    .input {
        width: 100%;
        height: 2.5rem;
        padding: 0.5rem 0.75rem;
        background: var(--color-bg-2);
        border: none;
        outline: 1px solid var(--color-outline);
        outline-offset: -1px;
        border-bottom: 1px solid var(--color-1);
        border-radius: 2px;
        color: var(--color-1);
        font-weight: 600;
        font-size: 0.8rem;

        &:focus {
            outline: 1px solid var(--color-1);
        }

        &:hover {
            outline: 1px solid var(--color-1);
        }

        &:disabled {
            color: var(--color-2);
            background: var(--color-bg-2);
        }

        &:read-only {
            color: var(--color-2);
            background: var(--color-bg-2);
        }

        &::placeholder {
            color: var(--color-text);
            opacity: 0.5;
            font-size: 0.8rem;
        }
    }
</style>
