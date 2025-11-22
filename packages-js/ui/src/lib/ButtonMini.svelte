<script lang="ts">
    interface Props {
        primary?: boolean;
        disabled?: boolean;
        onclick?: () => unknown;
        children?: import('svelte').Snippet;
    }

    let {
        primary = false,
        disabled = false,
        onclick = () => {},
        children,
    }: Props = $props();
</script>

<button type="button" {onclick} class:primary {disabled}>
    {@render children?.()}
</button>

<style lang="scss">
    button {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 2rem;
        width: 2rem;
        font-size: 1rem;
        color: var(--color-1);
        background: transparent;
        border: none;
        border-radius: 2px;
        outline: none;
        outline-offset: -1px;

        &:active,
        &:hover {
            color: var(--color-bg-2);
            background: var(--color-1);
            outline: 1px solid var(--color-1);
        }

        &:focus-visible {
            outline: 2px solid var(--color-1);
            outline-offset: 1px;
        }

        &:disabled {
            cursor: not-allowed;
            opacity: 0.5;
        }
    }

    .primary {
        background: var(--color-1);
        color: var(--color-bg-1);

        &:active,
        &:hover {
            background: var(--color-bg-1);
            color: var(--color-1);
            outline: 1px solid var(--color-1);
        }
    }
</style>
