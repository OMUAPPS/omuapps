<script lang="ts">
    export let value: boolean;
    export let disabled: boolean = false;
    export let label: string | undefined = undefined;

    function toggle() {
        value = !value;
    }
</script>

<label>
    {#if label}
        <span>{label}</span>
    {/if}
    <span class="toggle">
        <input type="checkbox" bind:checked={value} {disabled} on:click={toggle} />
        {#if value}
            <i class="ti ti-check"></i>
        {/if}
    </span>
</label>

<style lang="scss">
    label {
        display: flex;
        align-items: baseline;
    }

    .toggle {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px;
        cursor: pointer;
        user-select: none;

        input {
            width: 20px;
            height: 20px;
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
            left: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            color: var(--color-bg-2);
        }
    }
</style>
