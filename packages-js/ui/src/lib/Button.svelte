<script lang="ts" generics="T">
    export let primary = false;
    export let disabled = false;
    export let onclick: () => PromiseLike<T> | undefined | void = () => {};
    export let promise: PromiseLike<T> | undefined | void = undefined;
</script>

<button
    class="button"
    type="button"
    on:click={async () => {
        if (disabled) return;
        if (promise) {
            await promise;
        }
        promise = onclick();
        try {
            await promise;
        } catch (error) {
            console.error(error);
            setTimeout(() => {
                promise = undefined;
            }, 3000);
            return;
        }
        promise = undefined;
    }}
    class:primary
    disabled={disabled || !!promise}
>
    <span>
        <slot {promise} />
    </span>
</button>

<style lang="scss">
    .button {
        display: flex;
        align-items: center;
        background: var(--color-bg-1);
        color: var(--color-1);
        outline: 1px solid var(--color-1);
        outline-offset: -1px;
        border-radius: 2px;
        border: none;
        font-weight: 600;
        font-size: 0.8rem;
        white-space: nowrap;
        cursor: pointer;

        &:focus {
            outline: 1px solid var(--color-1);
            outline-offset: -1px;
        }

        &:focus-visible {
            outline: 2px solid var(--color-1);
            outline-offset: 2px;
        }

        &:disabled {
            background: var(--color-bg-2);
            outline: 1px solid var(--color-1);
            color: var(--color-1);
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    .primary {
        background: var(--color-1);
        color: var(--color-bg-1);
        justify-content: center;

        &:hover {
            background: var(--color-bg-1);
            color: var(--color-1);
            outline: 1px solid var(--color-1);
            outline-offset: -1px;
        }
    }

    span {
        display: flex;
        align-items: baseline;
        gap: 0.25rem;
        padding: 0.5rem 1rem;
    }
</style>
