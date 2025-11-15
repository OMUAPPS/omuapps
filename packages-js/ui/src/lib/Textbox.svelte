<script lang="ts">
    import { createEventDispatcher, onDestroy } from 'svelte';

    export let value: string = '';
    export let placeholder: string = '';
    export let disabled: boolean = false;
    export let readonly: boolean = false;
    export let lazy: boolean = false;
    export let focused: boolean = false;
    $: inputValue = value;
    let timer: number | undefined;
    let input: HTMLInputElement;

    $: {
        if (input && focused) {
            input.focus();
        }
    }

    const eventDispatcher = createEventDispatcher<{
        input: string;
    }>();

    function handleChange(event: Event) {
        const newValue = (event.target as HTMLInputElement).value;
        if (!lazy) {
            value = newValue;
            eventDispatcher('input', newValue);
            return;
        }
        if (timer) {
            clearTimeout(timer);
        }
        timer = window.setTimeout(() => {
            value = newValue;
            eventDispatcher('input', newValue);
        }, 300);
    }

    function exit() {
        focused = false;
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
    bind:this={input}
    on:input={handleChange}
    on:focus={() => focused = true}
    on:blur={exit}
/>

<style lang="scss">
    .input {
        width: 100%;
        min-height: 2.5rem;
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
