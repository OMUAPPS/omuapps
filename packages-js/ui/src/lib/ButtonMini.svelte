<script lang="ts">
    export let outline = false;
    export let disabled = false;
</script>

<button type="button" on:click class:outline {disabled}>
    <slot />
</button>

<style lang="scss">
    button {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 30px;
        height: 30px;
        padding-right: 6px;
        padding-left: 6px;
        font-size: 16px;
        color: var(--color-1);
        background: transparent;
        border: none;
        border-radius: 5px;
        outline: none;

        &:active,
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
</style>
