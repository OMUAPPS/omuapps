<script lang="ts" generics="T">
    type BooleanLike = true | false | T;
    export let value: BooleanLike;
    export let disabled: boolean = false;
    export let label: string | undefined = undefined;
    export let handle: (value: boolean) => unknown = () => {};

    function toggle() {
        if (value) {
            value = false;
        } else {
            value = true;
        }
        handle(value);
    }
</script>

<label>
    {#if label}
        <span>{label}</span>
    {/if}
    <span class="toggle">
        <input type="checkbox" checked={!!value} {disabled} on:click={toggle} />
        {#if value}
            <i class="ti ti-check"></i>
        {/if}
    </span>
</label>

<style lang="scss">
    label {
        display: flex;
        align-items: center;
    }

    .toggle {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        user-select: none;

        input {
            width: 1.5rem;
            height: 1.5rem;
            appearance: none;
            background: var(--color-bg-2);
            border: none;
            border-radius: 3px;
            outline: 1px solid var(--color-1);
            outline-offset: -1px;

            &:checked {
                background: var(--color-1);
                outline: none;
            }
        }

        &:hover {
            input {
                outline: 2px solid var(--color-1);
            }
        }

        i {
            position: absolute;
            left: 0.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 1rem;
            height: 1rem;
            color: var(--color-bg-2);
        }
    }
</style>
