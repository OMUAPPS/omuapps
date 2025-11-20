<script lang="ts">
    import { run } from 'svelte/legacy';

    import { createEventDispatcher, onDestroy } from 'svelte';

    interface Props {
        value?: string;
        placeholder?: string;
        disabled?: boolean;
        readonly?: boolean;
        lazy?: boolean;
        focused?: boolean;
        submit?: any;
    }

    let {
        value = $bindable(''),
        placeholder = '',
        disabled = false,
        readonly = false,
        lazy = false,
        focused = $bindable(false),
        submit = () => {},
    }: Props = $props();
    let inputValue = $derived(value);
    let timer: number | undefined;
    let input: HTMLInputElement = $state();

    run(() => {
        if (input && focused) {
            input.focus();
        }
    });

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
    oninput={handleChange}
    onkeydown={(event) => {
        if (event.key !== 'Enter') return;
        submit();
    }}
    onfocus={() => focused = true}
    onblur={exit}
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
