<script lang="ts">
    export let outline = false;
    export let rounded = false;
    export let filled = false;
    export let disabled = false;
</script>

<button
    class="button"
    type="button"
    on:click
    class:outline
    class:rounded
    class:filled
    {disabled}
>
    <slot />
</button>

<style lang="scss">
    .button {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 40px;
        min-height: 40px;
        max-height: 100%;
        padding-right: 10px;
        padding-left: 10px;
        font-size: 16px;
        color: var(--color-1);
        background: transparent;
        border: none;
        outline: none;

        &:hover {
            color: var(--color-bg-2);
            background: var(--color-1);
            outline: 2px solid #fff;
        }

        &:focus {
            outline: 2px solid var(--color-1);
        }

        &:disabled {
            cursor: not-allowed;
            opacity: 0.5;
        }
    }

    .outline {
        border: 1px solid var(--color-1);
    }

    .rounded {
        border-radius: 5px;
    }

    .filled {
        background: var(--color-bg-2);
    }
</style>
